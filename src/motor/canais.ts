/**
 * Seção 5.9 · Canais.
 *
 *   mc_canal           = preco − preco × comissao − preco × taxa_pagamento − embalagem − entrega − custo_ficha
 *   indice             = mc_canal / mc_salao
 *   preco_equivalencia = (mc_salao + embalagem + custo_ficha + entrega) / (1 − comissao − taxa_pagamento)
 *   entrega_de_virada  = custo de entrega acima do qual o plano em que a casa entrega perde
 *                        para o plano em que a plataforma entrega
 */
import { dividir } from "./numero";

export interface ParametrosCanal {
  nome: string;
  comissao: number;
  taxaPagamento: number;
  embalagem: number;
  /** Custo de entrega pago pela casa; zero quando a plataforma entrega. */
  entrega: number;
  entregaPor: "casa" | "plataforma" | "nenhuma";
}

export function mcCanal(preco: number, custoFicha: number, canal: Omit<ParametrosCanal, "nome" | "entregaPor">): number {
  return preco - preco * canal.comissao - preco * canal.taxaPagamento - canal.embalagem - canal.entrega - custoFicha;
}

export function indiceCanal(mcCanalValor: number, mcSalao: number): number | null {
  return dividir(mcCanalValor, mcSalao);
}

export function precoEquivalencia(params: { mcSalao: number; embalagem: number; custoFicha: number; entrega: number; comissao: number; taxaPagamento: number }): number | null {
  return dividir(params.mcSalao + params.embalagem + params.custoFicha + params.entrega, 1 - params.comissao - params.taxaPagamento);
}

/**
 * entrega_de_virada: custo de entrega em que a margem do plano "casa
 * entrega" iguala a do plano "plataforma entrega". Acima dele, entregar
 * com a casa perde.
 */
export function entregaDeVirada(preco: number, custoFicha: number, planoCasaEntrega: Omit<ParametrosCanal, "nome" | "entregaPor" | "entrega">, planoPlataformaEntrega: Omit<ParametrosCanal, "nome" | "entregaPor">): number {
  const mcCasaSemEntrega = mcCanal(preco, custoFicha, { ...planoCasaEntrega, entrega: 0 });
  const mcPlataforma = mcCanal(preco, custoFicha, planoPlataformaEntrega);
  return mcCasaSemEntrega - mcPlataforma;
}

export interface LinhaTabelaCanais {
  nome: string;
  comissao: number;
  margem: number;
  indice: number | null;
}

/** Tabela de margem por canal, com o salão como base 100. */
export function tabelaCanais(preco: number, custoFicha: number, canais: ParametrosCanal[]): LinhaTabelaCanais[] {
  const salao = canais.find((c) => c.entregaPor === "nenhuma" && c.comissao === 0) ?? canais[0];
  const mcSalao = salao ? mcCanal(preco, custoFicha, salao) : 0;
  return canais.map((c) => {
    const margem = mcCanal(preco, custoFicha, c);
    return { nome: c.nome, comissao: c.comissao, margem, indice: indiceCanal(margem, mcSalao) };
  });
}
