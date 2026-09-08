/**
 * Importador da exportação diária de vendas do Altec por segmento e
 * colaborador (seção 6.2 da especificação). Alimenta `vendas_dia`
 * (faturamento bruto, taxa de serviço, por segmento) e a produtividade de
 * garçom e barman (seção 5.7).
 *
 * O formato exato ainda não foi recebido; a detecção de colunas é por
 * sinônimo: grupo/segmento, produto, quantidade, valor líquido, valor
 * bruto, colaborador (código e nome, juntos ou separados), mesa, comanda e
 * data. O grupo é mapeado em segmento (cozinha, salão, bar, delivery);
 * grupo desconhecido fica sem segmento e gera aviso.
 *
 * Taxa de serviço: se o arquivo traz coluna ou item de taxa, ela é lida;
 * senão é calculada sobre a venda de cozinha, salão e bar (delivery não
 * paga serviço) com o `taxaServicoPct` recebido, e o aviso registra isso.
 * `faturamentoBruto` = venda líquida de descontos + taxa de serviço
 * ("total com 13%").
 */
import { arredondar } from "../motor/numero";
import { limparCategoria, lerPeriodoCabecalho, numeroOuNull } from "./altec_r3";
import { classificarCategoria, ehTaxaServico } from "./categorias";
import { parseDataBr } from "./numero_br";
import { celula, detectarCabecalhoPorColunas, linhaVazia } from "./tabela";
import { ehTotalizador, lerCodigoENome, normalizarTexto } from "./texto";
import type { MapaColunas, Segmento, Tabela } from "./tipos";

export const SINONIMOS_DIA: Record<string, string[]> = {
  data: ["Data", "Dt", "Data Venda", "Data da Venda", "Dia", "Data/Hora", "Data Movimento"],
  grupo: ["Grupo", "Segmento", "Categoria", "Setor", "Seção", "Secao", "Departamento", "Grupo de Produto"],
  produto: ["Produto", "Item", "Descrição", "Descricao", "Nome", "Nome do Produto"],
  qtde: ["Qtde", "Qtd", "Quant", "Quantidade", "Qte", "Qtde."],
  valor_bruto: ["Venda Bruta", "Vl Bruto", "Vl. Bruto", "Valor Bruto", "Val. Bruto", "Val Bruto", "Bruto", "Vl. Tabela", "Valor Tabela"],
  valor_liquido: [
    "Venda Líquida", "Venda Liquida", "Vl Líquido", "Vl. Líquido", "Valor Líquido", "Valor Liquido", "Líquido", "Liquido",
    "Total", "Vl Total", "Vl. Total", "Valor Total", "Total Líquido", "Valor",
  ],
  taxa_servico: ["Taxa de Serviço", "Taxa Serviço", "Tx Serviço", "Tx. Serviço", "Serviço", "Gorjeta", "Tx Serv"],
  colaborador_codigo: [
    "Cód. Garçom", "Cod Garcom", "Código Garçom", "Cód. Colaborador", "Cód. Vendedor", "Cód. Atendente", "Cód. Funcionário",
    "Cód. Operador", "Código do Colaborador", "Código do Garçom", "Cód",
  ],
  colaborador: ["Garçom", "Garcom", "Colaborador", "Vendedor", "Atendente", "Funcionário", "Funcionario", "Operador", "Barman", "Nome do Garçom", "Nome Colaborador"],
  mesa: ["Mesa", "Nº Mesa", "Num Mesa"],
  comanda: ["Comanda", "Nº Comanda", "Num Comanda", "Pedido", "Nº Pedido", "Cupom", "Conta"],
  canal: ["Canal", "Origem", "Tipo de Venda", "Modalidade"],
};

export interface OpcoesAltecDia {
  /** Taxa de serviço da casa: fração (0,13) ou percentual (13); usada só quando o arquivo não traz a taxa. */
  taxaServicoPct: number;
}

export interface LinhaDia {
  linha: number;
  data: string | null;
  grupo: string;
  segmento: Segmento | null;
  produto: string | null;
  qtde: number | null;
  /** Líquido de descontos, sem taxa de serviço. */
  valorLiquido: number;
  valorBruto: number | null;
  colaboradorCodigo: string | null;
  colaboradorNome: string | null;
  mesa: string | null;
  comanda: string | null;
}

export interface ColaboradorDia {
  codigo: string | null;
  nome: string | null;
  /** Segmento em que o colaborador mais vendeu. */
  segmento: Segmento | null;
  receita: number;
  itens: number;
  porSegmento: Record<Segmento, number>;
}

export interface ResultadoAltecDia {
  data: string | null;
  /** Venda líquida de descontos + taxa de serviço. */
  faturamentoBruto: number;
  /** Venda líquida de descontos, sem taxa de serviço. */
  vendas: number;
  taxaServico: number;
  /** Verdadeiro quando a taxa veio do arquivo; falso quando foi calculada com `taxaServicoPct`. */
  taxaServicoExplicita: boolean;
  porSegmento: Record<Segmento, number>;
  /** Venda de linhas cujo grupo não foi reconhecido. */
  semSegmento: number;
  /** Soma das quantidades do segmento cozinha. */
  pratosVendidos: number;
  porColaborador: ColaboradorDia[];
  linhas: LinhaDia[];
  avisos: string[];
  linhasLidas: number;
  linhasIgnoradas: number;
  colunas: MapaColunas;
}

function segmentosZerados(): Record<Segmento, number> {
  return { cozinha: 0, salao: 0, bar: 0, delivery: 0 };
}

/** Lê a venda do dia já convertida em tabela de texto (ver `lerTabela`). */
export function lerAltecDia(entrada: Tabela | string[][], opcoes: OpcoesAltecDia): ResultadoAltecDia {
  const linhas = Array.isArray(entrada) ? entrada : entrada.linhas;
  const avisos: string[] = [];
  const base: ResultadoAltecDia = {
    data: null,
    faturamentoBruto: 0,
    vendas: 0,
    taxaServico: 0,
    taxaServicoExplicita: false,
    porSegmento: segmentosZerados(),
    semSegmento: 0,
    pratosVendidos: 0,
    porColaborador: [],
    linhas: [],
    avisos,
    linhasLidas: 0,
    linhasIgnoradas: 0,
    colunas: {},
  };

  const cabecalho = detectarCabecalhoPorColunas(linhas, SINONIMOS_DIA, [
    ["valor_liquido", "valor_bruto"],
    ["produto", "grupo", "colaborador", "colaborador_codigo"],
  ]);
  if (!cabecalho) {
    avisos.push("Cabeçalho da venda do dia não encontrado: precisa de uma coluna de valor e uma de produto, grupo ou colaborador.");
    return base;
  }
  const { indice, colunas } = cabecalho;
  base.colunas = colunas;

  const periodoCabecalho = lerPeriodoCabecalho(linhas, indice);
  const resultado: LinhaDia[] = [];
  const gruposDesconhecidos = new Set<string>();
  let grupoAtual = "";
  let taxaExplicita: number | null = null;
  let lidas = 0;
  let ignoradas = 0;
  let cozinhaSemQtde = 0;

  for (let i = indice + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    lidas++;

    if (linha.some((c) => ehTotalizador(c))) {
      ignoradas++;
      continue;
    }

    const qtde = numeroOuNull(linha, colunas.qtde);
    const valorLiquidoLido = numeroOuNull(linha, colunas.valor_liquido);
    const valorBruto = numeroOuNull(linha, colunas.valor_bruto);
    const taxaLinha = numeroOuNull(linha, colunas.taxa_servico);
    const temNumero = qtde !== null || valorLiquidoLido !== null || valorBruto !== null;
    const preenchidas = linha.map((c) => c.trim()).filter((c) => c !== "");
    if (!temNumero && preenchidas.length === 1) {
      grupoAtual = limparCategoria(preenchidas[0] ?? "");
      ignoradas++;
      continue;
    }

    const grupoColuna = colunas.grupo === undefined ? "" : limparCategoria(celula(linha, colunas.grupo));
    if (grupoColuna !== "") grupoAtual = grupoColuna;
    const grupo = grupoAtual;
    const produto = celula(linha, colunas.produto) || null;

    if (ehTaxaServico(produto) || ehTaxaServico(grupo)) {
      const valorTaxa = valorLiquidoLido ?? valorBruto;
      if (valorTaxa !== null) taxaExplicita = (taxaExplicita ?? 0) + valorTaxa;
      ignoradas++;
      continue;
    }
    if (taxaLinha !== null) taxaExplicita = (taxaExplicita ?? 0) + taxaLinha;

    let valorLiquido = valorLiquidoLido;
    if (valorLiquido === null) {
      if (valorBruto === null) {
        avisos.push(`Linha ${i + 1} ignorada: sem valor${produto ? ` em "${produto}"` : ""}.`);
        ignoradas++;
        continue;
      }
      valorLiquido = valorBruto;
      avisos.push(`Linha ${i + 1}: sem valor líquido; usado o valor bruto${produto ? ` em "${produto}"` : ""}.`);
    }

    let segmento = classificarCategoria(grupo).segmento;
    const canalTexto = colunas.canal === undefined ? "" : celula(linha, colunas.canal);
    if (canalTexto !== "" && classificarCategoria(canalTexto).canal === "delivery") segmento = "delivery";
    if (segmento === null) gruposDesconhecidos.add(grupo === "" ? "(sem grupo)" : grupo);
    if (segmento === "cozinha" && qtde === null) cozinhaSemQtde++;

    const { codigo, nome } = lerCodigoENome(celula(linha, colunas.colaborador_codigo), celula(linha, colunas.colaborador));

    resultado.push({
      linha: i + 1,
      data: colunas.data === undefined ? null : parseDataBr(celula(linha, colunas.data)),
      grupo,
      segmento,
      produto,
      qtde,
      valorLiquido,
      valorBruto,
      colaboradorCodigo: codigo,
      colaboradorNome: nome,
      mesa: celula(linha, colunas.mesa) || null,
      comanda: celula(linha, colunas.comanda) || null,
    });
  }

  for (const grupo of gruposDesconhecidos) avisos.push(`Grupo desconhecido "${grupo}": sem segmento; classificar manualmente.`);
  if (cozinhaSemQtde > 0) avisos.push(`${cozinhaSemQtde} linha(s) de cozinha sem quantidade: pratos vendidos podem estar subestimados.`);

  // Data do arquivo: a única data das linhas, senão a do cabeçalho.
  const datas = [...new Set(resultado.map((l) => l.data).filter((d): d is string => d !== null))].sort();
  let data: string | null = null;
  if (datas.length === 1) data = datas[0] ?? null;
  else if (datas.length > 1) avisos.push(`Arquivo com ${datas.length} datas distintas (${datas[0]} a ${datas[datas.length - 1]}); data única não atribuída.`);
  else if (periodoCabecalho) {
    if (periodoCabecalho.inicio === periodoCabecalho.fim) data = periodoCabecalho.inicio;
    else avisos.push(`Cabeçalho indica período de ${periodoCabecalho.inicio} a ${periodoCabecalho.fim}; data única não atribuída.`);
  } else avisos.push("Data não encontrada no arquivo; o usuário precisa informar.");

  // Agregação por segmento.
  const porSegmento = segmentosZerados();
  let semSegmento = 0;
  let pratos = 0;
  for (const l of resultado) {
    if (l.segmento) porSegmento[l.segmento] += l.valorLiquido;
    else semSegmento += l.valorLiquido;
    if (l.segmento === "cozinha" && l.qtde !== null) pratos += l.qtde;
  }
  const vendas = porSegmento.cozinha + porSegmento.salao + porSegmento.bar + porSegmento.delivery + semSegmento;

  // Taxa de serviço.
  let taxaServico: number;
  let taxaServicoExplicita: boolean;
  if (taxaExplicita !== null) {
    taxaServico = taxaExplicita;
    taxaServicoExplicita = true;
  } else {
    const fracao = opcoes.taxaServicoPct > 1 ? opcoes.taxaServicoPct / 100 : opcoes.taxaServicoPct;
    const baseTaxa = porSegmento.cozinha + porSegmento.salao + porSegmento.bar + semSegmento;
    taxaServico = baseTaxa * fracao;
    taxaServicoExplicita = false;
    avisos.push(
      `Taxa de serviço não veio no arquivo: calculada como ${arredondar(fracao * 100, 2)}% sobre R$ ${arredondar(baseTaxa, 2)} (cozinha, salão e bar; delivery excluído) a partir do parâmetro taxaServicoPct.`,
    );
  }

  // Por colaborador.
  const colaboradores = new Map<string, ColaboradorDia>();
  for (const l of resultado) {
    if (l.colaboradorCodigo === null && l.colaboradorNome === null) continue;
    const chave = l.colaboradorCodigo ?? normalizarTexto(l.colaboradorNome);
    let c = colaboradores.get(chave);
    if (!c) {
      c = { codigo: l.colaboradorCodigo, nome: l.colaboradorNome, segmento: null, receita: 0, itens: 0, porSegmento: segmentosZerados() };
      colaboradores.set(chave, c);
    }
    if (c.nome === null && l.colaboradorNome !== null) c.nome = l.colaboradorNome;
    c.receita += l.valorLiquido;
    c.itens += l.qtde ?? 0;
    if (l.segmento) c.porSegmento[l.segmento] += l.valorLiquido;
  }
  const porColaborador = [...colaboradores.values()]
    .map((c) => {
      const segmentos = (Object.keys(c.porSegmento) as Segmento[]).filter((s) => c.porSegmento[s] > 0);
      segmentos.sort((a, b) => c.porSegmento[b] - c.porSegmento[a]);
      const porSeg = segmentosZerados();
      for (const s of segmentos) porSeg[s] = arredondar(c.porSegmento[s], 2);
      return { ...c, segmento: segmentos[0] ?? null, receita: arredondar(c.receita, 2), porSegmento: porSeg };
    })
    .sort((a, b) => b.receita - a.receita);

  return {
    data,
    faturamentoBruto: arredondar(vendas + taxaServico, 2),
    vendas: arredondar(vendas, 2),
    taxaServico: arredondar(taxaServico, 2),
    taxaServicoExplicita,
    porSegmento: {
      cozinha: arredondar(porSegmento.cozinha, 2),
      salao: arredondar(porSegmento.salao, 2),
      bar: arredondar(porSegmento.bar, 2),
      delivery: arredondar(porSegmento.delivery, 2),
    },
    semSegmento: arredondar(semSegmento, 2),
    pratosVendidos: pratos,
    porColaborador,
    linhas: resultado,
    avisos,
    linhasLidas: lidas,
    linhasIgnoradas: ignoradas,
    colunas,
  };
}
