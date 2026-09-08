/**
 * Seção 8 · Validações e alertas, como predicados puros.
 * Bloqueio impede salvar. Alerta salva e sinaliza. Confirmação pede um
 * "sim" explícito antes de salvar (provável erro de vírgula).
 */
import { LIMITE_DISTORCAO_RENDIMENTO } from "./custo";
import { LIMITE_GAP_CONTROLE } from "./estoque";
import { LIMITE_ADERENCIA, LIMITE_DESVIO_RENDIMENTO, MINIMO_REDUNDANCIA } from "./producao";
import { LIMITE_HORAS_EXTRAS } from "./gente";

export type NivelAlerta = "bloqueio" | "confirmacao" | "alerta" | "critico";

export interface Alerta {
  codigo: string;
  nivel: NivelAlerta;
  mensagem: string;
}

export const GRAMAGEM_MAXIMA_KG = 1;
export const GRAMAGEM_MINIMA_KG = 0.0005;
export const LIMITE_CUSTO_PRODUCAO_VS_INSUMO = 0.5;
export const TETO_ENTRADA_CRITICO = 0.33;
export const ALERTA_DOCUMENTO_DIAS_PADRAO = 60;

export function alertaGramagem(quantidadeKg: number): Alerta | null {
  if (quantidadeKg > GRAMAGEM_MAXIMA_KG) return { codigo: "gramagem_alta", nivel: "confirmacao", mensagem: "Gramagem por porção acima de 1 kg. Provável erro de vírgula; confirme." };
  if (quantidadeKg > 0 && quantidadeKg < GRAMAGEM_MINIMA_KG) return { codigo: "gramagem_baixa", nivel: "confirmacao", mensagem: "Gramagem por porção abaixo de 0,5 g. Provável erro de vírgula; confirme." };
  return null;
}

export function alertaCustoProducaoVsInsumo(custoProducaoPorKg: number, custoInsumoEquivalentePorKg: number): Alerta | null {
  const razao = custoProducaoPorKg / custoInsumoEquivalentePorKg - 1;
  if (Math.abs(razao) > LIMITE_CUSTO_PRODUCAO_VS_INSUMO) {
    return { codigo: "custo_producao_desviado", nivel: "alerta", mensagem: `Custo por quilo da produção ${razao > 0 ? "acima" : "abaixo"} de 50% do insumo equivalente.` };
  }
  return null;
}

export function alertaFichaSemMotivo(motivo: string | null | undefined): Alerta | null {
  if (!motivo || motivo.trim().length === 0) return { codigo: "ficha_sem_motivo", nivel: "bloqueio", mensagem: "Ficha alterada sem motivo e sem versão nova: bloqueado. Informe o motivo; a alteração gera versão nova." };
  return null;
}

export function alertaDistorcao(distorcao: number | null, insumoResponsavel: string | null): Alerta | null {
  if (distorcao !== null && distorcao > LIMITE_DISTORCAO_RENDIMENTO) {
    return { codigo: "distorcao_rendimento", nivel: "alerta", mensagem: `Distorção entre CMV com e sem rendimento acima de 3 pontos${insumoResponsavel ? `; insumo responsável: ${insumoResponsavel}` : ""}.` };
  }
  return null;
}

export function alertaFornecedoresClasseA(curva: string, homologados: number): Alerta | null {
  if (curva === "A" && homologados < 2) return { codigo: "classe_a_sem_redundancia", nivel: "alerta", mensagem: "Insumo classe A com menos de 2 fornecedores homologados." };
  return null;
}

export function alertaPrecoForaDaFaixa(preco: number, piso: number | null, teto: number | null): Alerta | null {
  if (piso !== null && preco < piso) return { codigo: "preco_abaixo_piso", nivel: "alerta", mensagem: "Preço de venda abaixo do piso da seção." };
  if (teto !== null && preco > teto) return { codigo: "preco_acima_teto", nivel: "alerta", mensagem: "Preço de venda acima do teto da seção." };
  return null;
}

export function alertaCmvItem(cmv: number | null, metaBloco: number, bloco: string): Alerta | null {
  if (cmv === null) return null;
  if (bloco === "entrada" && cmv > TETO_ENTRADA_CRITICO) return { codigo: "cmv_entrada_critico", nivel: "critico", mensagem: "Entrada acima de 33% de CMV: alerta crítico." };
  if (cmv > metaBloco) return { codigo: "cmv_acima_meta", nivel: "alerta", mensagem: "Item acima da meta de CMV do bloco." };
  return null;
}

export function alertaGap(gap: number | null): Alerta | null {
  if (gap !== null && gap > LIMITE_GAP_CONTROLE) return { codigo: "gap_controle", nivel: "alerta", mensagem: "Gap de controle acima de 2 pontos. Decomponha: porcionamento, perda não registrada, cortesia não lançada, erro de contagem." };
  return null;
}

export function alertaAderencia(aderencia: number | null, etapasAtrasadas: string[]): Alerta | null {
  if (aderencia !== null && aderencia < LIMITE_ADERENCIA) return { codigo: "aderencia_baixa", nivel: "alerta", mensagem: `Aderência ao cronograma abaixo de 95% na semana. Etapas atrasadas: ${etapasAtrasadas.join(", ") || "sem detalhe"}.` };
  return null;
}

export function alertaDesvioRendimento(desvio: number | null): Alerta | null {
  if (desvio !== null && Math.abs(desvio) > LIMITE_DESVIO_RENDIMENTO) return { codigo: "desvio_rendimento", nivel: "alerta", mensagem: "Desvio de rendimento acima de 3% na batelada." };
  return null;
}

export function alertaDivergenciaConciliacao(divergencia: number): Alerta | null {
  if (Math.abs(divergencia) >= 0.005) return { codigo: "divergencia_conciliacao", nivel: "alerta", mensagem: "Divergência de conciliação diferente de zero." };
  return null;
}

export function alertaRedundancia(certificados: number): Alerta | null {
  if (certificados < MINIMO_REDUNDANCIA) return { codigo: "processo_sem_redundancia", nivel: "alerta", mensagem: "Processo crítico com menos de 2 certificados." };
  return null;
}

export function alertaHorasExtras(pct: number | null): Alerta | null {
  if (pct !== null && pct > LIMITE_HORAS_EXTRAS) return { codigo: "horas_extras", nivel: "alerta", mensagem: "Horas extras acima de 5% da folha no mês." };
  return null;
}

export function alertaDocumentoRisco(vencimento: Date, hoje: Date, alertaDias = ALERTA_DOCUMENTO_DIAS_PADRAO): Alerta | null {
  const dias = Math.floor((vencimento.getTime() - hoje.getTime()) / 86_400_000);
  if (dias < 0) return { codigo: "documento_vencido", nivel: "critico", mensagem: "Documento de risco vencido: destaque permanente." };
  if (dias <= alertaDias) return { codigo: "documento_vencendo", nivel: "alerta", mensagem: `Documento de risco vence em ${dias} dia${dias === 1 ? "" : "s"}.` };
  return null;
}
