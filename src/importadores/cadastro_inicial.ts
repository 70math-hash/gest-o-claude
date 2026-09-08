/**
 * Importador da planilha de cadastro inicial (seção 6.4 da especificação):
 * insumos, produções intermediárias e fichas técnicas, com relatório de
 * inconsistência.
 *
 * Aceita os três layouts em abas de um mesmo arquivo ou em arquivos
 * separados; cada bloco é reconhecido pelo seu cabeçalho (o nome da aba
 * só serve de dica):
 * - Insumos: Nome, Categoria, Unidade compra, Unidade uso, Preço,
 *   Rendimento %, Fornecedor, Data do preço.
 * - Produções: Código, Nome, Rendimento, Unidade do rendimento, Custo por
 *   unidade.
 * - Fichas: Produto, ID Altec, Ingrediente ou Produção, Quantidade,
 *   Unidade, Rendimento %. Produto e ID em branco repetem a linha anterior.
 *
 * Inconsistências (seções 6.4 e 8): produção sem rendimento, gramagem
 * suspeita (porção acima de 1 kg ou abaixo de 0,5 g), insumo sem preço,
 * preço sem data, rendimento fora da faixa de 1 a 100.
 *
 * Rendimento entra em percentual (88); um valor entre 0 e 1 é lido como
 * fração (0,88 → 88). Nada é preenchido por padrão: o que falta vira
 * inconsistência ou aviso.
 */
import { arredondar } from "../motor/numero";
import { parseDataBr, parseNumeroBr } from "./numero_br";
import { celula, linhaVazia, mapearColunas } from "./tabela";
import { ehTotalizador, nomeChave, normalizarChaveColuna, normalizarTexto } from "./texto";
import type { MapaColunas, Tabela } from "./tipos";

export const SINONIMOS_INSUMOS: Record<string, string[]> = {
  nome: ["Nome", "Insumo", "Descrição", "Descricao", "Nome do Insumo", "Ingrediente"],
  categoria: ["Categoria", "Grupo", "Família", "Familia"],
  unidadeCompra: ["Unidade compra", "Unidade de compra", "Un. Compra", "Un Compra", "Unid Compra", "Unid. Compra", "Unidade Compra"],
  unidadeUso: ["Unidade uso", "Unidade de uso", "Un. Uso", "Un Uso", "Unid Uso", "Unid. Uso", "Unidade"],
  preco: ["Preço", "Preco", "Preço unitário", "Preço por unidade", "Preço de compra", "Custo", "Valor"],
  rendimento: ["Rendimento %", "Rendimento", "RN", "Rend", "Rend. %", "Aproveitamento"],
  fornecedor: ["Fornecedor", "Fornecedor padrão", "Fornecedor Padrao"],
  dataPreco: ["Data do preço", "Data preço", "Data do preco", "Data", "Vigência", "Vigencia", "Data cotação", "Data da cotação"],
};

export const SINONIMOS_PRODUCOES: Record<string, string[]> = {
  codigo: ["Código", "Codigo", "Cód", "Cod", "Código Altec", "Cód. Altec", "ID"],
  nome: ["Nome", "Produção", "Producao", "Descrição", "Descricao", "Nome da Produção"],
  rendimento: ["Rendimento", "Rendimento declarado", "Rend", "Rendimento da batelada", "Rendimento batelada"],
  unidadeRendimento: ["Unidade do rendimento", "Unidade rendimento", "Un. Rendimento", "Un Rendimento", "Unidade", "Un"],
  custoPorUnidade: ["Custo por unidade", "Custo unitário", "Custo/un", "Custo por kg", "Custo por unidade de rendimento", "Custo"],
};

export const SINONIMOS_FICHAS: Record<string, string[]> = {
  produto: ["Produto", "Prato", "Nome do Produto", "Ficha"],
  idAltec: ["ID Altec", "Id Altec", "ID", "Cód. Altec", "Código Altec", "Cód", "Código", "Codigo"],
  componente: ["Ingrediente ou Produção", "Ingrediente ou Producao", "Ingrediente", "Insumo", "Componente", "Item", "Produção", "Insumo ou Produção"],
  tipo: ["Tipo", "Origem", "Tipo do componente"],
  quantidade: ["Quantidade", "Qtde", "Qtd", "Gramagem", "Quant", "Peso"],
  unidade: ["Unidade", "Un", "Und", "Unid", "Un."],
  rendimento: ["Rendimento %", "Rendimento", "RN", "Rend", "Rend. %"],
};

export type LayoutCadastro = "insumos" | "producoes" | "fichas";

export interface InsumoImportado {
  linha: number;
  nome: string;
  categoria: string | null;
  unidadeCompra: string | null;
  unidadeUso: string | null;
  preco: number | null;
  /** Percentual de 1 a 100. */
  rendimentoPct: number | null;
  fornecedor: string | null;
  /** ISO aaaa-mm-dd. */
  dataPreco: string | null;
}

export interface ProducaoImportada {
  linha: number;
  codigoAltec: string | null;
  nome: string;
  /** Rendimento da batelada na unidade informada (2,2 kg). */
  rendimento: number | null;
  unidadeRendimento: string | null;
  custoPorUnidade: number | null;
}

export type UnidadeCadastro = "g" | "kg" | "ml" | "l" | "un";

export interface ItemFichaImportado {
  linha: number;
  /** Texto original da coluna de ingrediente ou produção. */
  componente: string;
  /** Nome sem o sufixo "(produção 218)". */
  nomeComponente: string;
  tipo: "insumo" | "producao" | null;
  codigoProducao: string | null;
  quantidade: number | null;
  unidade: string | null;
  unidadeNormalizada: UnidadeCadastro | null;
  rendimentoPct: number | null;
}

export interface FichaImportada {
  linha: number;
  produto: string;
  idAltec: string | null;
  itens: ItemFichaImportado[];
}

export type TipoInconsistencia = "producao_sem_rendimento" | "gramagem_suspeita" | "insumo_sem_preco" | "preco_sem_data" | "rendimento_fora_da_faixa";

export interface Inconsistencia {
  tipo: TipoInconsistencia;
  referencia: string;
  detalhe: string;
}

export interface BlocoCadastro {
  layout: LayoutCadastro;
  aba: string | null;
  linhaCabecalho: number;
  linhas: number;
  colunas: MapaColunas;
}

export interface ResultadoCadastroInicial {
  insumos: InsumoImportado[];
  producoes: ProducaoImportada[];
  fichas: FichaImportada[];
  relatorioInconsistencias: Inconsistencia[];
  avisos: string[];
  blocos: BlocoCadastro[];
}

/** Lê uma ou mais tabelas (abas ou arquivos) de cadastro inicial. */
export function lerCadastroInicial(entrada: Tabela | Tabela[]): ResultadoCadastroInicial {
  const tabelas = Array.isArray(entrada) ? entrada : [entrada];
  const resultado: ResultadoCadastroInicial = { insumos: [], producoes: [], fichas: [], relatorioInconsistencias: [], avisos: [], blocos: [] };

  for (const tabela of tabelas) {
    const abas = tabela.abas && tabela.abas.length > 0 ? tabela.abas : [{ nome: "", inicio: 0, fim: tabela.linhas.length }];
    for (const aba of abas) {
      const dica = dicaDeLayout(aba.nome);
      let i = aba.inicio;
      while (i < aba.fim) {
        const layout = identificarLayout(tabela.linhas[i] ?? [], dica);
        if (!layout) {
          i++;
          continue;
        }
        let fim = i + 1;
        while (fim < aba.fim && !identificarLayout(tabela.linhas[fim] ?? [], dica)) fim++;
        const dados = tabela.linhas.slice(i + 1, fim);
        const deslocamento = i + 2; // número da primeira linha de dados, a partir de 1
        if (layout.layout === "insumos") lerInsumos(dados, deslocamento, layout.colunas, resultado);
        else if (layout.layout === "producoes") lerProducoes(dados, deslocamento, layout.colunas, resultado);
        else lerFichas(dados, deslocamento, layout.colunas, resultado);
        resultado.blocos.push({ layout: layout.layout, aba: aba.nome || null, linhaCabecalho: i + 1, linhas: dados.filter((l) => !linhaVazia(l)).length, colunas: layout.colunas });
        i = fim;
      }
    }
  }

  if (resultado.blocos.length === 0) resultado.avisos.push("Nenhum cabeçalho de Insumos, Produções ou Fichas encontrado.");
  resolverTiposDeFicha(resultado);
  return resultado;
}

function dicaDeLayout(nomeAba: string): LayoutCadastro | null {
  const n = normalizarTexto(nomeAba);
  if (n.includes("INSUMO") || n.includes("INGREDIENTE")) return "insumos";
  if (n.includes("PRODUC")) return "producoes";
  if (n.includes("FICHA") || n.includes("RECEITA")) return "fichas";
  return null;
}

/** Pontua o cabeçalho contra um conjunto de sinônimos: 2 por coluna igual, 1 por prefixo. */
function pontuarCabecalho(linha: string[], sinonimos: Record<string, string[]>): number {
  const chaves = linha.map(normalizarChaveColuna).filter((c) => c !== "");
  let pontos = 0;
  for (const [canonico, lista] of Object.entries(sinonimos)) {
    const alvos = [canonico, ...lista].map(normalizarChaveColuna);
    if (chaves.some((c) => alvos.includes(c))) pontos += 2;
    else if (chaves.some((c) => alvos.some((a) => c.startsWith(`${a} `)))) pontos += 1;
  }
  return pontos;
}

interface LayoutIdentificado {
  layout: LayoutCadastro;
  colunas: MapaColunas;
  pontos: number;
}

function identificarLayout(linha: string[], dica: LayoutCadastro | null): LayoutIdentificado | null {
  if (linhaVazia(linha)) return null;
  const candidatos: LayoutIdentificado[] = [];
  const bonus = (layout: LayoutCadastro): number => (dica === layout ? 3 : 0);

  const insumos = mapearColunas(linha, SINONIMOS_INSUMOS);
  if ("nome" in insumos && ("unidadeCompra" in insumos || "preco" in insumos || "unidadeUso" in insumos)) {
    candidatos.push({ layout: "insumos", colunas: insumos, pontos: pontuarCabecalho(linha, SINONIMOS_INSUMOS) + bonus("insumos") });
  }
  const producoes = mapearColunas(linha, SINONIMOS_PRODUCOES);
  if ("nome" in producoes && "rendimento" in producoes && ("codigo" in producoes || "custoPorUnidade" in producoes || "unidadeRendimento" in producoes)) {
    candidatos.push({ layout: "producoes", colunas: producoes, pontos: pontuarCabecalho(linha, SINONIMOS_PRODUCOES) + bonus("producoes") });
  }
  const fichas = mapearColunas(linha, SINONIMOS_FICHAS);
  if ("produto" in fichas && "componente" in fichas && "quantidade" in fichas) {
    candidatos.push({ layout: "fichas", colunas: fichas, pontos: pontuarCabecalho(linha, SINONIMOS_FICHAS) + bonus("fichas") });
  }
  candidatos.sort((a, b) => b.pontos - a.pontos);
  return candidatos[0] ?? null;
}

function lerInsumos(dados: string[][], deslocamento: number, colunas: MapaColunas, resultado: ResultadoCadastroInicial): void {
  dados.forEach((linha, idx) => {
    if (linhaVazia(linha) || linha.some((c) => ehTotalizador(c))) return;
    const numero = deslocamento + idx;
    const nome = celula(linha, colunas.nome);
    if (nome === "") {
      resultado.avisos.push(`Insumos, linha ${numero}: sem nome; ignorada.`);
      return;
    }
    const preco = parseNumeroBr(celula(linha, colunas.preco));
    const dataPreco = parseDataBr(celula(linha, colunas.dataPreco));
    const rendimentoPct = parseRendimentoPct(celula(linha, colunas.rendimento));
    const insumo: InsumoImportado = {
      linha: numero,
      nome,
      categoria: celula(linha, colunas.categoria) || null,
      unidadeCompra: celula(linha, colunas.unidadeCompra) || null,
      unidadeUso: celula(linha, colunas.unidadeUso) || null,
      preco,
      rendimentoPct,
      fornecedor: celula(linha, colunas.fornecedor) || null,
      dataPreco,
    };
    resultado.insumos.push(insumo);

    if (preco === null || preco <= 0) {
      resultado.relatorioInconsistencias.push({ tipo: "insumo_sem_preco", referencia: nome, detalhe: `linha ${numero}: preço ausente ou zero` });
    } else if (dataPreco === null) {
      resultado.relatorioInconsistencias.push({ tipo: "preco_sem_data", referencia: nome, detalhe: `linha ${numero}: preço ${preco} sem data de vigência` });
    }
    if (rendimentoPct === null) {
      resultado.relatorioInconsistencias.push({ tipo: "rendimento_fora_da_faixa", referencia: nome, detalhe: `linha ${numero}: rendimento não informado (cadastro sem rendimento não salva)` });
    } else if (rendimentoPct < 1 || rendimentoPct > 100) {
      resultado.relatorioInconsistencias.push({ tipo: "rendimento_fora_da_faixa", referencia: nome, detalhe: `linha ${numero}: rendimento ${rendimentoPct}% fora de 1 a 100` });
    }
  });
}

function lerProducoes(dados: string[][], deslocamento: number, colunas: MapaColunas, resultado: ResultadoCadastroInicial): void {
  dados.forEach((linha, idx) => {
    if (linhaVazia(linha) || linha.some((c) => ehTotalizador(c))) return;
    const numero = deslocamento + idx;
    const nome = celula(linha, colunas.nome);
    if (nome === "") {
      resultado.avisos.push(`Produções, linha ${numero}: sem nome; ignorada.`);
      return;
    }
    const rendimento = parseNumeroBr(celula(linha, colunas.rendimento));
    const producao: ProducaoImportada = {
      linha: numero,
      codigoAltec: celula(linha, colunas.codigo) || null,
      nome,
      rendimento,
      unidadeRendimento: celula(linha, colunas.unidadeRendimento) || null,
      custoPorUnidade: parseNumeroBr(celula(linha, colunas.custoPorUnidade)),
    };
    resultado.producoes.push(producao);
    if (rendimento === null || rendimento <= 0) {
      const codigo = producao.codigoAltec ? ` (código ${producao.codigoAltec})` : "";
      resultado.relatorioInconsistencias.push({ tipo: "producao_sem_rendimento", referencia: nome, detalhe: `linha ${numero}${codigo}: rendimento de batelada não informado; bloqueio da seção 8` });
    }
  });
}

function lerFichas(dados: string[][], deslocamento: number, colunas: MapaColunas, resultado: ResultadoCadastroInicial): void {
  let atual: FichaImportada | null = null;
  dados.forEach((linha, idx) => {
    if (linhaVazia(linha) || linha.some((c) => ehTotalizador(c))) return;
    const numero = deslocamento + idx;
    const produto = celula(linha, colunas.produto);
    const idAltec = celula(linha, colunas.idAltec) || null;
    if (produto !== "" && (atual === null || normalizarTexto(atual.produto) !== normalizarTexto(produto))) {
      atual = { linha: numero, produto, idAltec, itens: [] };
      resultado.fichas.push(atual);
    } else if (atual !== null && atual.idAltec === null && idAltec !== null) {
      atual.idAltec = idAltec;
    }
    if (atual === null) {
      resultado.avisos.push(`Fichas, linha ${numero}: componente sem produto; ignorada.`);
      return;
    }
    const componente = celula(linha, colunas.componente);
    if (componente === "") {
      if (produto !== "") return; // linha só com o nome do produto
      resultado.avisos.push(`Fichas, linha ${numero} (${atual.produto}): sem ingrediente ou produção; ignorada.`);
      return;
    }
    const codigoProducao = /\(\s*(?:produ[çc][ãa]o|prod\.?)\s*(\d+)\s*\)/i.exec(componente)?.[1] ?? null;
    const nomeComponente = componente.replace(/\(\s*(?:produ[çc][ãa]o|prod\.?)[^)]*\)/i, "").replace(/\s+/g, " ").trim();
    const tipoTexto = normalizarTexto(celula(linha, colunas.tipo));
    let tipo: ItemFichaImportado["tipo"] = null;
    if (tipoTexto.startsWith("PROD")) tipo = "producao";
    else if (tipoTexto.startsWith("INSUMO") || tipoTexto.startsWith("INGRED")) tipo = "insumo";
    else if (codigoProducao !== null || /\bprodu[çc][ãa]o\b/i.test(componente)) tipo = "producao";

    const quantidade = parseNumeroBr(celula(linha, colunas.quantidade));
    const unidade = celula(linha, colunas.unidade) || null;
    const unidadeNormalizada = normalizarUnidade(unidade);
    const rendimentoPct = parseRendimentoPct(celula(linha, colunas.rendimento));
    const item: ItemFichaImportado = { linha: numero, componente, nomeComponente, tipo, codigoProducao, quantidade, unidade, unidadeNormalizada, rendimentoPct };
    atual.itens.push(item);

    const referencia = `${atual.produto} › ${nomeComponente}`;
    if (quantidade === null) {
      resultado.avisos.push(`Fichas, linha ${numero} (${referencia}): quantidade ausente ou não numérica.`);
    } else if (unidadeNormalizada === null) {
      resultado.avisos.push(`Fichas, linha ${numero} (${referencia}): unidade "${unidade ?? ""}" não reconhecida; gramagem não conferida.`);
    } else if (unidadeNormalizada !== "un") {
      const gramas = quantidade * (unidadeNormalizada === "kg" || unidadeNormalizada === "l" ? 1000 : 1);
      if (gramas > 1000 || (gramas > 0 && gramas < 0.5)) {
        resultado.relatorioInconsistencias.push({
          tipo: "gramagem_suspeita",
          referencia,
          detalhe: `linha ${numero}: ${quantidade} ${unidadeNormalizada} por porção (${gramas > 1000 ? "acima de 1 kg" : "abaixo de 0,5 g"}); provável erro de vírgula`,
        });
      }
    }
    if (rendimentoPct !== null && (rendimentoPct < 1 || rendimentoPct > 100)) {
      resultado.relatorioInconsistencias.push({ tipo: "rendimento_fora_da_faixa", referencia, detalhe: `linha ${numero}: rendimento ${rendimentoPct}% fora de 1 a 100` });
    }
  });
  for (const ficha of resultado.fichas) {
    if (ficha.itens.length === 0) resultado.avisos.push(`Ficha "${ficha.produto}" sem itens.`);
    if (ficha.idAltec === null) resultado.avisos.push(`Ficha "${ficha.produto}" sem ID Altec; mapeamento por nome.`);
  }
}

/** Depois de ler todos os blocos, resolve o tipo dos componentes de ficha ainda sem tipo pelos nomes de insumos e produções. */
function resolverTiposDeFicha(resultado: ResultadoCadastroInicial): void {
  const insumos = new Set(resultado.insumos.map((i) => nomeChave(i.nome)));
  const producoesPorNome = new Set(resultado.producoes.map((p) => nomeChave(p.nome)));
  const producoesPorCodigo = new Set(resultado.producoes.map((p) => p.codigoAltec).filter((c): c is string => c !== null));
  for (const ficha of resultado.fichas) {
    for (const item of ficha.itens) {
      if (item.tipo !== null) {
        if (item.tipo === "producao" && item.codigoProducao !== null && producoesPorCodigo.size > 0 && !producoesPorCodigo.has(item.codigoProducao)) {
          resultado.avisos.push(`Ficha "${ficha.produto}": produção ${item.codigoProducao} (${item.nomeComponente}) não está no bloco de produções.`);
        }
        continue;
      }
      const chave = nomeChave(item.nomeComponente);
      if (producoesPorNome.has(chave)) item.tipo = "producao";
      else if (insumos.has(chave)) item.tipo = "insumo";
      else resultado.avisos.push(`Ficha "${ficha.produto}": componente "${item.nomeComponente}" não encontrado em insumos nem produções.`);
    }
  }
}

/** "88", "88%", "0,88" → 88. Valores entre 0 e 1 são fração. */
export function parseRendimentoPct(texto: string): number | null {
  const valor = parseNumeroBr(texto);
  if (valor === null) return null;
  if (valor > 0 && valor <= 1) return arredondar(valor * 100, 4);
  return valor;
}

export function normalizarUnidade(texto: string | null | undefined): UnidadeCadastro | null {
  const t = normalizarTexto(texto).replace(/[^A-Z]/g, "");
  if (["G", "GR", "GRAMA", "GRAMAS"].includes(t)) return "g";
  if (["KG", "KILO", "KILOS", "QUILO", "QUILOS"].includes(t)) return "kg";
  if (["ML", "MILILITRO", "MILILITROS"].includes(t)) return "ml";
  if (["L", "LT", "LTS", "LITRO", "LITROS"].includes(t)) return "l";
  if (["UN", "UND", "UNID", "UNIDADE", "UNIDADES", "PC", "PCS", "PECA", "PECAS", "FATIA", "FATIAS", "PORCAO", "PORCOES"].includes(t)) return "un";
  return null;
}
