/**
 * Importador do relatório R3 do Altec, "Vendas por Produto Detalhado"
 * (seção 6.1 da especificação).
 *
 * O arquivo (XLSX ou CSV) começa com um cabeçalho institucional, em geral
 * de 12 linhas, seguido do cabeçalho real, detectado pela coluna "Produto".
 * As colunas normalizadas são Categoria, ID, Produto, Qtde, Vl_Tabela,
 * Desc_Prod, Desc_Global, Val_Bruto, Total e %_Total, aceitas por sinônimo.
 * A categoria pode vir como coluna ou como linha de agrupamento (só a
 * primeira célula com texto, nenhuma coluna numérica preenchida) e é
 * carregada adiante. Linhas de Subtotal e Total são descartadas; números
 * brasileiros são convertidos; o período é lido do cabeçalho institucional.
 *
 * Duas bases de CMV saem daqui: `total` já é líquido de descontos e é a
 * base do CMV operacional; `valBruto` é tabela cheia e é a base do CMV de
 * cardápio.
 *
 * `mapearProdutos` casa cada linha com o catálogo: primeiro pelo ID Altec,
 * depois pelo nome no Altec normalizado, por fim pela chave sem sufixos
 * operacionais. Linha sem match vai para `pendentes` e a importação fica
 * pendente até resolver (seção 8).
 */
import { classificarCategoria } from "./categorias";
import { parseDataBr, parseNumeroBr } from "./numero_br";
import { celula, detectarCabecalho, linhaVazia, mapearColunas } from "./tabela";
import { ehTotalizador, nomeChave, normalizarTexto } from "./texto";
import type { Bloco, Canal, MapaColunas, Periodo, Tabela } from "./tipos";

/** Sinônimos aceitos para cada coluna normalizada do R3. */
export const SINONIMOS_R3: Record<string, string[]> = {
  categoria: ["Categoria", "Grupo", "Cat", "Seção", "Secao", "Departamento", "Grupo de Produto"],
  id: ["ID", "Cód", "Cod", "Código", "Codigo", "Cód. Produto", "Código do Produto", "ID Produto", "Cód Prod", "Cod Prod"],
  produto: ["Produto", "Descrição", "Descricao", "Item", "Nome", "Nome do Produto"],
  qtde: ["Qtde", "Qtd", "Quant", "Quantidade", "Qtde Vendida", "Qte", "Qtde."],
  vl_tabela: ["Vl. Tabela", "Vl Tabela", "Valor Tabela", "Vlr Tabela", "Preço Tabela", "Preco Tabela", "Vl. Unit", "Vl Unit", "Valor Unitário", "Preço Unitário"],
  desc_prod: ["Desc. Prod", "Desc Prod", "Desc Produto", "Desc. Produto", "Desconto Produto", "Desconto Prod", "Desc. Item", "Desc Item"],
  desc_global: ["Desc. Global", "Desc Global", "Desconto Global", "Desc. Geral", "Desc Geral", "Desconto Geral"],
  val_bruto: ["Val. Bruto", "Val Bruto", "Valor Bruto", "Vl. Bruto", "Vl Bruto", "Vlr Bruto", "Bruto"],
  total: ["Total", "Vl. Total", "Vl Total", "Valor Total", "Total Líquido", "Total Liquido", "Valor Líquido", "Valor Liquido", "Vl. Líquido", "Líquido", "Liquido"],
  pct_total: ["% Total", "%_Total", "%Total", "Pct Total", "Perc Total", "Perc. Total", "Percentual", "Part. %", "Part %", "%"],
};

export interface LinhaR3 {
  /** Número da linha no arquivo (a partir de 1), para mensagens e conferência. */
  linha: number;
  categoriaAltec: string;
  bloco: Bloco | null;
  canal: Canal;
  idAltec: string | null;
  nomeAltec: string;
  nomeChave: string;
  qtde: number;
  vlTabela: number | null;
  descProd: number | null;
  descGlobal: number | null;
  valBruto: number | null;
  /** Líquido de descontos: base do CMV operacional. */
  total: number;
  pctTotal: number | null;
}

export interface ResultadoR3 {
  periodo: Periodo | null;
  linhas: LinhaR3[];
  avisos: string[];
  linhasLidas: number;
  linhasIgnoradas: number;
  /** Colunas encontradas no cabeçalho real (nome canônico → índice). */
  colunas: MapaColunas;
  /** Categorias sem bloco conhecido, na ordem em que apareceram, para a fila de classificação manual. */
  categoriasDesconhecidas: string[];
}

/** Lê o R3 já convertido em tabela de texto (ver `lerTabela`). */
export function lerAltecR3(entrada: Tabela | string[][]): ResultadoR3 {
  const linhas = Array.isArray(entrada) ? entrada : entrada.linhas;
  const avisos: string[] = [];
  const vazio = (periodo: Periodo | null, colunas: MapaColunas): ResultadoR3 => ({
    periodo,
    linhas: [],
    avisos,
    linhasLidas: 0,
    linhasIgnoradas: 0,
    colunas,
    categoriasDesconhecidas: [],
  });

  const indiceCabecalho = detectarCabecalho(linhas, "Produto", {
    exigirTambem: ["Qtde", "Qtd", "Quant", "Quantidade", "Total", "Val Bruto", "Valor Bruto"],
  });
  if (indiceCabecalho === null) {
    avisos.push('Cabeçalho do R3 não encontrado: nenhuma linha tem a coluna "Produto" ao lado de uma coluna de quantidade ou total.');
    return vazio(lerPeriodoCabecalho(linhas, Math.min(linhas.length, 12)), {});
  }

  const colunas = mapearColunas(linhas[indiceCabecalho] ?? [], SINONIMOS_R3);
  const periodo = lerPeriodoCabecalho(linhas, indiceCabecalho);
  if (!periodo) avisos.push("Período não encontrado no cabeçalho institucional; o usuário precisa informar.");

  const iProduto = colunas.produto;
  const iQtde = colunas.qtde;
  const iTotal = colunas.total;
  if (iProduto === undefined || iQtde === undefined || iTotal === undefined) {
    const faltam = ["produto", "qtde", "total"].filter((c) => !(c in colunas));
    avisos.push(`Colunas obrigatórias ausentes no R3: ${faltam.join(", ")}.`);
    return vazio(periodo, colunas);
  }

  const colunasNumericas = [iQtde, iTotal, colunas.vl_tabela, colunas.val_bruto, colunas.desc_prod, colunas.desc_global, colunas.pct_total].filter(
    (i): i is number => i !== undefined,
  );

  const resultado: LinhaR3[] = [];
  const desconhecidas = new Map<string, number>();
  let categoriaAtual = "";
  let lidas = 0;
  let ignoradas = 0;

  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    lidas++;

    if (linha.some((c) => ehTotalizador(c))) {
      ignoradas++;
      continue;
    }

    const preenchidas = linha.map((c) => c.trim()).filter((c) => c !== "");
    const temNumero = colunasNumericas.some((idx) => parseNumeroBr(celula(linha, idx)) !== null);
    if (!temNumero && preenchidas.length === 1) {
      // Linha de agrupamento: a categoria vale para as linhas seguintes.
      categoriaAtual = limparCategoria(preenchidas[0] ?? "");
      ignoradas++;
      continue;
    }

    const nomeAltec = celula(linha, iProduto);
    if (nomeAltec === "") {
      ignoradas++;
      continue;
    }

    const qtde = parseNumeroBr(celula(linha, iQtde));
    const total = parseNumeroBr(celula(linha, iTotal));
    if (qtde === null || total === null) {
      avisos.push(`Linha ${i + 1} ignorada: quantidade ou total não numérico em "${nomeAltec}".`);
      ignoradas++;
      continue;
    }

    const categoriaColuna = colunas.categoria === undefined ? "" : limparCategoria(celula(linha, colunas.categoria));
    if (categoriaColuna !== "") categoriaAtual = categoriaColuna;
    const categoriaAltec = categoriaAtual;
    const classe = classificarCategoria(categoriaAltec);
    if (classe.bloco === null) {
      const chave = categoriaAltec === "" ? "(sem categoria)" : categoriaAltec;
      desconhecidas.set(chave, (desconhecidas.get(chave) ?? 0) + 1);
    }

    resultado.push({
      linha: i + 1,
      categoriaAltec,
      bloco: classe.bloco,
      canal: classe.canal,
      idAltec: normalizarIdAltec(celula(linha, colunas.id)),
      nomeAltec,
      nomeChave: nomeChave(nomeAltec),
      qtde,
      vlTabela: numeroOuNull(linha, colunas.vl_tabela),
      descProd: numeroOuNull(linha, colunas.desc_prod),
      descGlobal: numeroOuNull(linha, colunas.desc_global),
      valBruto: numeroOuNull(linha, colunas.val_bruto),
      total,
      pctTotal: numeroOuNull(linha, colunas.pct_total),
    });
  }

  for (const [categoria, n] of desconhecidas) {
    avisos.push(`Categoria desconhecida "${categoria}" (${n} linha${n === 1 ? "" : "s"}): sem bloco; classificar manualmente.`);
  }

  return {
    periodo,
    linhas: resultado,
    avisos,
    linhasLidas: lidas,
    linhasIgnoradas: ignoradas,
    colunas,
    categoriasDesconhecidas: [...desconhecidas.keys()],
  };
}

/** Número da célula na coluna, ou null quando a coluna não existe ou a célula não é numérica. */
export function numeroOuNull(linha: string[], indice: number | undefined): number | null {
  if (indice === undefined) return null;
  return parseNumeroBr(celula(linha, indice));
}

/** "Categoria: PIZZAS", "PIZZAS:" ou "PIZZAS (12 itens)" → "PIZZAS". Mantém a grafia original. */
export function limparCategoria(texto: string): string {
  return texto
    .trim()
    .replace(/^(?:categoria|grupo|se[çc][ãa]o|setor)\s*:\s*/i, "")
    .replace(/\s*\(\s*\d+\s*(?:itens?|linhas?|produtos?)?\s*\)\s*$/i, "")
    .replace(/[\s:]+$/, "")
    .trim();
}

/** ID do Altec como texto: "100010,0" e "100010.0" viram "100010"; vazio vira null. */
export function normalizarIdAltec(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) return null;
  const t = texto.trim();
  if (t === "") return null;
  const m = /^(\d+)(?:[.,]0+)?$/.exec(t);
  return m && m[1] !== undefined ? m[1] : normalizarTexto(t);
}

const DATA = "(\\d{1,2}/\\d{1,2}/\\d{2,4})";
const PADROES_PERIODO: RegExp[] = [
  new RegExp(`PERIODO\\s*:?\\s*(?:DE\\s+)?${DATA}\\s*(?:A|ATE|-|–|/)\\s*${DATA}`),
  new RegExp(`DE\\s+${DATA}\\s+(?:ATE|A)\\s+${DATA}`),
  new RegExp(`${DATA}\\s*(?:A|ATE|-|–)\\s*${DATA}`),
];
const PADRAO_DATA_UNICA = new RegExp(`(?:PERIODO|DATA|DIA|MOVIMENTO)\\s*:?\\s*${DATA}`);

/**
 * Período do cabeçalho institucional, procurado nas `ate` primeiras linhas:
 * "Período: 01/04/2026 a 30/04/2026", "de 01/04/2026 até 30/04/2026",
 * duas datas separadas por "a" ou "-", ou uma data única ("Data: 05/04/2026").
 * Sem padrão reconhecido, devolve null e o usuário informa (seção 6.1).
 */
export function lerPeriodoCabecalho(linhas: string[][], ate: number): Periodo | null {
  const limite = Math.min(linhas.length, Math.max(ate, 0));
  const textos: string[] = [];
  for (let i = 0; i < limite; i++) textos.push(normalizarTexto((linhas[i] ?? []).join(" ")));

  for (const padrao of PADROES_PERIODO) {
    for (const texto of textos) {
      const m = padrao.exec(texto);
      if (!m) continue;
      const inicio = parseDataBr(m[1]);
      const fim = parseDataBr(m[2]);
      if (inicio && fim) return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
    }
  }
  for (const texto of textos) {
    const m = PADRAO_DATA_UNICA.exec(texto);
    if (!m) continue;
    const data = parseDataBr(m[1]);
    if (data) return { inicio: data, fim: data };
  }
  return null;
}

/** Produto do catálogo (tabela `produtos`) com o que o mapeamento precisa. */
export interface ProdutoCatalogo {
  produtoId: string;
  idAltec: string | null;
  nomeAltec: string;
  nome: string;
  /** Opcional: desempata quando dois produtos têm a mesma chave de nome (Burrata pizza e Burrata entrada). */
  bloco?: Bloco | null;
}

export type CriterioMapeamento = "id_altec" | "nome_altec" | "nome_chave";

export interface LinhaR3Mapeada extends LinhaR3 {
  produtoId: string;
  criterio: CriterioMapeamento;
}

export interface ResultadoMapeamento {
  mapeadas: LinhaR3Mapeada[];
  pendentes: LinhaR3[];
  avisos: string[];
}

/**
 * Casa as linhas do R3 com o catálogo: ID Altec, depois nome no Altec
 * normalizado, depois chave sem sufixos (do nome no Altec ou do nome do
 * sistema). Match ambíguo dentro de um critério é desempatado pelo bloco
 * quando o catálogo o traz; senão fica pendente com aviso.
 */
export function mapearProdutos(linhas: LinhaR3[], catalogo: ProdutoCatalogo[]): ResultadoMapeamento {
  const porId = new Map<string, ProdutoCatalogo[]>();
  const porNomeAltec = new Map<string, ProdutoCatalogo[]>();
  const porChave = new Map<string, ProdutoCatalogo[]>();
  const juntar = (mapa: Map<string, ProdutoCatalogo[]>, chave: string | null, produto: ProdutoCatalogo): void => {
    if (!chave) return;
    const lista = mapa.get(chave) ?? [];
    if (!lista.includes(produto)) lista.push(produto);
    mapa.set(chave, lista);
  };
  for (const produto of catalogo) {
    juntar(porId, normalizarIdAltec(produto.idAltec), produto);
    juntar(porNomeAltec, normalizarTexto(produto.nomeAltec) || null, produto);
    juntar(porChave, nomeChave(produto.nomeAltec) || null, produto);
    juntar(porChave, nomeChave(produto.nome) || null, produto);
  }

  const mapeadas: LinhaR3Mapeada[] = [];
  const pendentes: LinhaR3[] = [];
  const avisos: string[] = [];

  for (const linha of linhas) {
    const idLinha = normalizarIdAltec(linha.idAltec);
    const tentativas: Array<[CriterioMapeamento, ProdutoCatalogo[] | undefined]> = [
      ["id_altec", idLinha ? porId.get(idLinha) : undefined],
      ["nome_altec", porNomeAltec.get(normalizarTexto(linha.nomeAltec))],
      ["nome_chave", linha.nomeChave ? porChave.get(linha.nomeChave) : undefined],
    ];
    let escolhida: LinhaR3Mapeada | null = null;
    for (const [criterio, candidatos] of tentativas) {
      if (!candidatos || candidatos.length === 0) continue;
      const unico = desempatar(candidatos, linha.bloco);
      if (unico) {
        escolhida = { ...linha, produtoId: unico.produtoId, criterio };
      } else {
        avisos.push(`Linha ${linha.linha} ("${linha.nomeAltec}"): ${candidatos.length} produtos do catálogo casam por ${criterio}; mapear manualmente.`);
      }
      break;
    }
    if (escolhida) mapeadas.push(escolhida);
    else pendentes.push(linha);
  }
  return { mapeadas, pendentes, avisos };
}

function desempatar(candidatos: ProdutoCatalogo[], bloco: Bloco | null): ProdutoCatalogo | null {
  if (candidatos.length === 1) return candidatos[0] ?? null;
  if (bloco) {
    const mesmoBloco = candidatos.filter((c) => c.bloco === bloco);
    if (mesmoBloco.length === 1) return mesmoBloco[0] ?? null;
  }
  return null;
}
