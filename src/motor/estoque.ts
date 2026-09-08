/**
 * Seção 5.4 · Estoque, CMV real e gap.
 *
 *   cmv_real_reais   = estoque_inicial + compras_periodo − estoque_final   (por base: cozinha ou bar)
 *   cmv_real_pct     = cmv_real_reais / receita_periodo_da_mesma_base
 *   gap_controle     = cmv_real_pct − cmv_teorico_ponderado_pct           (mesma base, mesmo período)
 *   ponto_pedido     = consumo_medio_diario × prazo_entrega_dias + estoque_seguranca
 *   giro_estoque     = cmv_periodo / estoque_medio
 *   cobertura_dias   = estoque_medio / cmv_diario
 *   acuracidade      = itens cuja contagem bate com o sistema / itens contados
 *   perda_pct_cmv    = valor_perdas / cmv_periodo
 *
 * Regra 5 da seção 2: nunca misturar bases. As funções recebem a base
 * explicitamente e o chamador é obrigado a passar receita e teórico da
 * mesma base.
 */
import { dividir } from "./numero";
import type { Base } from "./tipos";

/** Gap acima deste valor (2 pontos) gera alerta mensal com decomposição. */
export const LIMITE_GAP_CONTROLE = 0.02;

export function cmvRealReais(estoqueInicial: number, comprasPeriodo: number, estoqueFinal: number): number {
  return estoqueInicial + comprasPeriodo - estoqueFinal;
}

export function cmvRealPct(cmvRealReais: number, receitaMesmaBase: number): number | null {
  return dividir(cmvRealReais, receitaMesmaBase);
}

export interface GapControle {
  base: Base;
  cmvRealPct: number;
  cmvTeoricoPct: number;
  gap: number;
  alerta: boolean;
  /** Inventário rotativo dos itens A gera gap parcial, marcado na tela. */
  parcial: boolean;
}

export function gapControle(params: { base: Base; cmvRealPct: number; cmvTeoricoPct: number; parcial?: boolean }): GapControle {
  const gap = params.cmvRealPct - params.cmvTeoricoPct;
  return { base: params.base, cmvRealPct: params.cmvRealPct, cmvTeoricoPct: params.cmvTeoricoPct, gap, alerta: gap > LIMITE_GAP_CONTROLE, parcial: params.parcial ?? false };
}

/**
 * Decomposição sugerida do gap (seção 8): porcionamento, perda não
 * registrada, cortesia não lançada, erro de contagem. Só o que foi
 * lançado é atribuído; o resto fica como "não explicado", nunca como
 * número inventado.
 */
export function decomposicaoGap(params: {
  gapReais: number;
  perdasRegistradas: number;
  cortesiasRegistradas: number;
  ajustesContagem: number;
}): { perdas: number; cortesias: number; contagem: number; naoExplicado: number; sugestoes: string[] } {
  const explicado = params.perdasRegistradas + params.cortesiasRegistradas + params.ajustesContagem;
  const naoExplicado = params.gapReais - explicado;
  const sugestoes: string[] = [];
  if (naoExplicado > 0) {
    sugestoes.push("porcionamento acima da ficha", "perda não registrada", "cortesia não lançada", "erro de contagem");
  }
  return { perdas: params.perdasRegistradas, cortesias: params.cortesiasRegistradas, contagem: params.ajustesContagem, naoExplicado, sugestoes };
}

export function pontoPedido(consumoMedioDiario: number, prazoEntregaDias: number, estoqueSeguranca: number): number {
  return consumoMedioDiario * prazoEntregaDias + estoqueSeguranca;
}

export function giroEstoque(cmvPeriodo: number, estoqueMedio: number): number | null {
  return dividir(cmvPeriodo, estoqueMedio);
}

export function coberturaDias(estoqueMedio: number, cmvDiario: number): number | null {
  return dividir(estoqueMedio, cmvDiario);
}

export function acuracidade(itensQueBatem: number, itensContados: number): number | null {
  return dividir(itensQueBatem, itensContados);
}

export function perdaPctCmv(valorPerdas: number, cmvPeriodo: number): number | null {
  return dividir(valorPerdas, cmvPeriodo);
}
