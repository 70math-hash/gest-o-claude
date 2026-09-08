/**
 * Seção 5.6 · Financeiro.
 *
 *   receita_liquida        = receita_bruta − impostos − taxas_pagamento − comissoes_marketplace
 *   margem_contribuicao    = receita_liquida − cmv − embalagem
 *   mc_pct                 = margem_contribuicao / receita_bruta
 *   custos_fixos           = soma das contas de natureza fixo e semifixo do período
 *   resultado_operacional  = margem_contribuicao − custos_fixos   (antes de pró-labore e depreciação)
 *   prime_cost_pct         = (cmv + folha_com_encargos) / receita_bruta
 *   ponto_equilibrio_reais    = custos_fixos / mc_pct
 *   ponto_equilibrio_clientes = ponto_equilibrio_reais / ticket_medio
 *   ponto_equilibrio_por_dia  = ponto_equilibrio_clientes / dias_abertos
 *   dia_de_virada             = primeiro dia do mês em que receita acumulada ≥ ponto_equilibrio_reais
 *   margem_seguranca          = (receita − ponto_equilibrio_reais) / receita
 *   ncg                       = estoque + contas_a_receber − contas_a_pagar
 *
 * Confirmado pelo Matheus em 07/09/2026 (D-005):
 *   receita_lucro_alvo  = (custos_fixos + lucro_alvo) / mc_pct
 *   clientes_lucro_alvo = receita_lucro_alvo / ticket_medio
 *
 * A análise vertical expressa toda linha como fração da receita bruta.
 */
import { dividir } from "./numero";

export type NaturezaConta = "variavel" | "fixo" | "semifixo";

export interface EntradasDre {
  receitaBruta: number;
  impostos: number;
  taxasPagamento: number;
  comissoesMarketplace: number;
  cmv: number;
  embalagem: number;
  folhaComEncargos: number;
  /** Demais linhas fixas e semifixas, já agrupadas (ocupação, utilidades, operacional, marketing...). */
  outrosFixos: Array<{ nome: string; valor: number }>;
}

export interface LinhaDre {
  nome: string;
  valor: number;
  /** Fração da receita bruta (análise vertical). */
  vertical: number | null;
}

export interface DreVertical {
  linhas: LinhaDre[];
  receitaLiquida: number;
  margemContribuicao: number;
  mcPct: number | null;
  custosFixos: number;
  resultadoOperacional: number;
  resultadoPct: number | null;
  primeCostPct: number | null;
}

export function receitaLiquida(e: Pick<EntradasDre, "receitaBruta" | "impostos" | "taxasPagamento" | "comissoesMarketplace">): number {
  return e.receitaBruta - e.impostos - e.taxasPagamento - e.comissoesMarketplace;
}

export function margemContribuicao(receitaLiquidaValor: number, cmv: number, embalagem: number): number {
  return receitaLiquidaValor - cmv - embalagem;
}

export function mcPct(margemContribuicaoValor: number, receitaBruta: number): number | null {
  return dividir(margemContribuicaoValor, receitaBruta);
}

/** custos_fixos: soma das contas de natureza fixo e semifixo. */
export function custosFixos(contas: Array<{ natureza: NaturezaConta; valor: number }>): number {
  return contas.filter((c) => c.natureza === "fixo" || c.natureza === "semifixo").reduce((s, c) => s + c.valor, 0);
}

export function resultadoOperacional(margemContribuicaoValor: number, custosFixosValor: number): number {
  return margemContribuicaoValor - custosFixosValor;
}

export function primeCostPct(cmv: number, folhaComEncargos: number, receitaBruta: number): number | null {
  return dividir(cmv + folhaComEncargos, receitaBruta);
}

/** DRE gerencial vertical completo, toda linha como fração da receita bruta. */
export function dreVertical(e: EntradasDre): DreVertical {
  const rb = e.receitaBruta;
  const v = (valor: number) => dividir(valor, rb);
  const rl = receitaLiquida(e);
  const mc = margemContribuicao(rl, e.cmv, e.embalagem);
  const fixos = e.folhaComEncargos + e.outrosFixos.reduce((s, f) => s + f.valor, 0);
  const resultado = resultadoOperacional(mc, fixos);
  const linhas: LinhaDre[] = [
    { nome: "Receita bruta", valor: rb, vertical: v(rb) },
    { nome: "Impostos", valor: -e.impostos, vertical: v(-e.impostos) },
    { nome: "Taxas de pagamento", valor: -e.taxasPagamento, vertical: v(-e.taxasPagamento) },
    { nome: "Comissões de marketplace", valor: -e.comissoesMarketplace, vertical: v(-e.comissoesMarketplace) },
    { nome: "Receita líquida", valor: rl, vertical: v(rl) },
    { nome: "CMV", valor: -e.cmv, vertical: v(-e.cmv) },
    { nome: "Embalagem", valor: -e.embalagem, vertical: v(-e.embalagem) },
    { nome: "Margem de contribuição", valor: mc, vertical: v(mc) },
    { nome: "Folha com encargos", valor: -e.folhaComEncargos, vertical: v(-e.folhaComEncargos) },
    ...e.outrosFixos.map((f) => ({ nome: f.nome, valor: -f.valor, vertical: v(-f.valor) })),
    { nome: "Custos fixos e semifixos", valor: -fixos, vertical: v(-fixos) },
    { nome: "Resultado operacional", valor: resultado, vertical: v(resultado) },
  ];
  return {
    linhas,
    receitaLiquida: rl,
    margemContribuicao: mc,
    mcPct: mcPct(mc, rb),
    custosFixos: fixos,
    resultadoOperacional: resultado,
    resultadoPct: v(resultado),
    primeCostPct: primeCostPct(e.cmv, e.folhaComEncargos, rb),
  };
}

export interface PontoEquilibrio {
  margemContribuicao: number;
  mcPct: number | null;
  reais: number | null;
  clientes: number | null;
  porDia: number | null;
  margemSeguranca: number | null;
  receitaLucroAlvo: number | null;
  clientesLucroAlvo: number | null;
}

export function pontoEquilibrio(params: {
  receita: number;
  custosVariaveis: number;
  custosFixos: number;
  ticketMedio: number;
  diasAbertos: number;
  lucroAlvo?: number;
}): PontoEquilibrio {
  const mc = params.receita - params.custosVariaveis;
  const pct = dividir(mc, params.receita);
  const reais = pct === null ? null : dividir(params.custosFixos, pct);
  const clientes = reais === null ? null : dividir(reais, params.ticketMedio);
  const porDia = clientes === null ? null : dividir(clientes, params.diasAbertos);
  const margemSeguranca = reais === null ? null : dividir(params.receita - reais, params.receita);
  const alvo = params.lucroAlvo ?? null;
  const receitaLucroAlvo = alvo === null || pct === null ? null : dividir(params.custosFixos + alvo, pct);
  const clientesLucroAlvo = receitaLucroAlvo === null ? null : dividir(receitaLucroAlvo, params.ticketMedio);
  return { margemContribuicao: mc, mcPct: pct, reais, clientes, porDia, margemSeguranca, receitaLucroAlvo, clientesLucroAlvo };
}

/** dia_de_virada: primeiro dia do mês em que a receita acumulada alcança o ponto de equilíbrio. */
export function diaDeVirada(receitasDiarias: Array<{ dia: number; receita: number }>, pontoEquilibrioReais: number): number | null {
  let acumulado = 0;
  for (const r of [...receitasDiarias].sort((a, b) => a.dia - b.dia)) {
    acumulado += r.receita;
    if (acumulado >= pontoEquilibrioReais) return r.dia;
  }
  return null;
}

export function ncg(estoque: number, contasAReceber: number, contasAPagar: number): number {
  return estoque + contasAReceber - contasAPagar;
}
