/**
 * Seção 5.3 · Precificação.
 *
 *   preco_minimo   = custo_ficha / meta_cmv_bloco
 *   preco_sugerido = arredondar para cima ao múltiplo de R$ 5,00 ≥ preco_minimo
 *   verificar piso e teto da seção; fora da faixa gera alerta e não bloqueia
 *
 * Regra 6 da seção 2: meta é teto, não alvo. O preço sugerido é o menor
 * preço redondo que respeita o teto; o sistema nunca sugere subir custo.
 */
import { arredondarParaCimaMultiplo, dividir } from "./numero";

export const MULTIPLO_PRECO = 5;

export function precoMinimo(custoFicha: number, metaCmvBloco: number): number | null {
  return dividir(custoFicha, metaCmvBloco);
}

export function precoSugerido(custoFicha: number, metaCmvBloco: number, multiplo = MULTIPLO_PRECO): number | null {
  const minimo = precoMinimo(custoFicha, metaCmvBloco);
  if (minimo === null) return null;
  return arredondarParaCimaMultiplo(minimo, multiplo);
}

export type SituacaoFaixa = "dentro" | "abaixo_do_piso" | "acima_do_teto";

/** Piso e teto da seção: fora da faixa é alerta, nunca bloqueio. */
export function verificarFaixa(preco: number, piso: number | null, teto: number | null): { situacao: SituacaoFaixa; alerta: boolean } {
  if (piso !== null && preco < piso) return { situacao: "abaixo_do_piso", alerta: true };
  if (teto !== null && preco > teto) return { situacao: "acima_do_teto", alerta: true };
  return { situacao: "dentro", alerta: false };
}
