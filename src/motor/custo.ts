/**
 * Seção 5.1 · Custo e CMV teórico.
 *
 *   custo_ingrediente        = (quantidade_em_kg × preco_por_kg) / rendimento
 *   custo_altec_ingrediente  = quantidade_em_kg × preco_por_kg        (sem rendimento, só para comparar)
 *   custo_producao_por_kg    = soma(custo_ingredientes da batelada) / rendimento_declarado_kg
 *   custo_ficha              = soma(custo_ingrediente) + soma(quantidade × custo_producao_por_kg)
 *   cmv_teorico_item         = custo_ficha / preco_venda
 *   cmv_altec_item           = custo_altec_ficha / preco_venda
 *   distorcao_rendimento     = cmv_teorico_item − cmv_altec_item      (alerta se > 0,03)
 *   cmv_ponderado_bloco      = soma(custo_ficha × qtde) / soma(total_liquido)
 *   cmv_ponderado_tabela     = soma(custo_ficha × qtde) / soma(val_bruto)
 *   margem_contribuicao_item = preco_venda − custo_ficha − preco_venda × (imposto + taxa_pagamento)
 *   margem_90d_item          = margem_contribuicao_item × qtde_90d
 */
import { ErroBloqueio, dividir, validarRendimento } from "./numero";
import type { CustoFicha, CustoItemFicha, ItemFicha, UnidadeBase, UnidadeFicha } from "./tipos";

/** Limite de distorção entre CMV com e sem rendimento (3 pontos). */
export const LIMITE_DISTORCAO_RENDIMENTO = 0.03;

/** Converte a quantidade pesada na ficha para a unidade base do insumo (kg, L ou un). */
export function converterParaBase(quantidade: number, unidade: UnidadeFicha, unidadeBase: UnidadeBase): number {
  if (unidadeBase === "kg") {
    if (unidade === "g") return quantidade / 1000;
    if (unidade === "kg") return quantidade;
  }
  if (unidadeBase === "l") {
    if (unidade === "ml") return quantidade / 1000;
    if (unidade === "l") return quantidade;
  }
  if (unidadeBase === "un" && unidade === "un") return quantidade;
  throw new ErroBloqueio(`unidade da ficha (${unidade}) incompatível com a unidade do insumo (${unidadeBase})`);
}

/** custo_ingrediente e custo_altec_ingrediente de uma linha de insumo. */
export function custoIngrediente(params: {
  quantidade: number;
  unidade: UnidadeFicha;
  precoPorUnidadeBase: number;
  unidadeBase: UnidadeBase;
  rendimento: number;
}): { custo: number; custoAltec: number; quantidadeBase: number } {
  const rendimento = validarRendimento(params.rendimento, "rendimento do insumo");
  const quantidadeBase = converterParaBase(params.quantidade, params.unidade, params.unidadeBase);
  const custoAltec = quantidadeBase * params.precoPorUnidadeBase;
  return { custo: custoAltec / rendimento, custoAltec, quantidadeBase };
}

/**
 * custo_producao_por_kg: custo da batelada dividido pelo rendimento declarado.
 * Rendimento ausente ou zero é bloqueio (seção 8, primeira linha).
 */
export function custoProducaoPorUnidade(params: {
  custoBatelada: number;
  rendimentoDeclarado: number | null | undefined;
}): number {
  const r = params.rendimentoDeclarado;
  if (r === null || r === undefined || !Number.isFinite(r) || r <= 0) {
    throw new ErroBloqueio("produção intermediária sem rendimento declarado: cadastro bloqueado");
  }
  return params.custoBatelada / r;
}

/** Custo de uma batelada a partir das suas linhas (insumos e produções filhas), já com rendimento. */
export function custoBatelada(itens: ItemFicha[]): CustoFicha {
  return custoFicha(itens);
}

/**
 * custo_ficha: soma dos custos com rendimento (insumos) e das produções
 * intermediárias (quantidade × custo por unidade de rendimento).
 * Devolve também o custo Altec (sem rendimento) para a comparação lado a lado.
 */
export function custoFicha(itens: ItemFicha[]): CustoFicha {
  const linhas: CustoItemFicha[] = itens.map((item) => {
    if (item.tipo === "insumo") {
      const r = custoIngrediente(item);
      return { nome: item.nome, tipo: "insumo", quantidadeBase: r.quantidadeBase, custo: r.custo, custoAltec: r.custoAltec, distorcao: r.custo - r.custoAltec };
    }
    const quantidadeBase = converterParaBase(item.quantidade, item.unidade, item.unidadeBase);
    const rendimentoUso = validarRendimento(item.rendimentoUso ?? 1, "rendimento de uso da produção");
    const custo = (quantidadeBase * item.custoPorUnidadeBase) / rendimentoUso;
    const custoAltec = quantidadeBase * (item.custoAltecPorUnidadeBase ?? item.custoPorUnidadeBase);
    return { nome: item.nome, tipo: "producao", quantidadeBase, custo, custoAltec, distorcao: custo - custoAltec };
  });
  return {
    custo: linhas.reduce((s, l) => s + l.custo, 0),
    custoAltec: linhas.reduce((s, l) => s + l.custoAltec, 0),
    itens: linhas,
  };
}

/** cmv_teorico_item (ou cmv_altec_item, conforme o custo passado). */
export function cmvItem(custo: number, precoVenda: number): number | null {
  return dividir(custo, precoVenda);
}

/**
 * distorcao_rendimento = cmv_teorico_item − cmv_altec_item.
 * Acima de 3 pontos, alerta apontando o insumo responsável (maior distorção).
 */
export function distorcaoRendimento(ficha: CustoFicha, precoVenda: number): {
  distorcao: number | null;
  alerta: boolean;
  insumoResponsavel: string | null;
} {
  const cmvReal = cmvItem(ficha.custo, precoVenda);
  const cmvAltec = cmvItem(ficha.custoAltec, precoVenda);
  if (cmvReal === null || cmvAltec === null) return { distorcao: null, alerta: false, insumoResponsavel: null };
  const distorcao = cmvReal - cmvAltec;
  const responsavel = [...ficha.itens].sort((a, b) => b.distorcao - a.distorcao)[0];
  return {
    distorcao,
    alerta: distorcao > LIMITE_DISTORCAO_RENDIMENTO,
    insumoResponsavel: responsavel && responsavel.distorcao > 0 ? responsavel.nome : null,
  };
}

export interface VendaItemParaCmv {
  custoFicha: number;
  qtde: number;
  /** Total líquido de descontos (coluna Total do R3). */
  total: number;
  /** Valor a preço de tabela cheia (coluna Val_Bruto do R3). */
  valBruto: number;
}

/**
 * cmv_ponderado_bloco (operacional, sobre o total líquido) e
 * cmv_ponderado_tabela (cardápio a preço cheio, sobre val_bruto).
 */
export function cmvPonderado(vendas: VendaItemParaCmv[]): {
  custoTotal: number;
  receitaLiquida: number;
  receitaTabela: number;
  cmvOperacional: number | null;
  cmvTabela: number | null;
} {
  const custoTotal = vendas.reduce((s, v) => s + v.custoFicha * v.qtde, 0);
  const receitaLiquida = vendas.reduce((s, v) => s + v.total, 0);
  const receitaTabela = vendas.reduce((s, v) => s + v.valBruto, 0);
  return {
    custoTotal,
    receitaLiquida,
    receitaTabela,
    cmvOperacional: dividir(custoTotal, receitaLiquida),
    cmvTabela: dividir(custoTotal, receitaTabela),
  };
}

/** margem_contribuicao_item = preco − custo − preco × (imposto + taxa_pagamento). */
export function margemContribuicaoItem(params: {
  precoVenda: number;
  custoFicha: number;
  imposto: number;
  taxaPagamento: number;
}): number {
  return params.precoVenda - params.custoFicha - params.precoVenda * (params.imposto + params.taxaPagamento);
}

/** margem_90d_item = margem_contribuicao_item × qtde_90d. */
export function margem90dItem(margemContribuicaoUnitaria: number, qtde90d: number): number {
  return margemContribuicaoUnitaria * qtde90d;
}
