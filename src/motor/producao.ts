/**
 * Seção 5.5 · Produção.
 *
 *   demanda_projetada = média de venda daquele dia da semana (últimas 8 a 12 semanas) × fator_sazonal
 *   producao_sugerida = demanda_projetada × fator_seguranca − saldo_dia_anterior
 *      fator_seguranca padrão 1,05 a 1,10; item de alta variação 1,15
 *   aderencia_cronograma = etapas conferidas dentro da janela / etapas do dia
 *   desvio_rendimento    = (rendimento_real − rendimento_declarado) / rendimento_declarado
 *   sobra_pct            = sobra / produzido
 *   refugo_pct           = itens refeitos / itens produzidos
 *   cobertura_pop        = processos com POP testado / processos críticos
 *   redundancia          = certificados nível ≥ 2 por processo crítico   (mínimo 2)
 */
import { dividir, media } from "./numero";

export const FATOR_SEGURANCA_PADRAO = 1.1;
export const FATOR_SEGURANCA_ALTA_VARIACAO = 1.15;
export const LIMITE_ADERENCIA = 0.95;
export const LIMITE_DESVIO_RENDIMENTO = 0.03;
export const LIMITE_SOBRA = 0.05;
export const MINIMO_REDUNDANCIA = 2;
export const SEMANAS_MINIMAS_DEMANDA = 8;
export const SEMANAS_MAXIMAS_DEMANDA = 12;

/**
 * demanda_projetada. Recebe as vendas do mesmo dia da semana, da mais
 * recente para a mais antiga; usa até 12 semanas. Com menos de 8 semanas
 * devolve null e o motivo (regra 10: sem dado, nunca média disfarçada).
 */
export function demandaProjetada(vendasMesmoDiaSemana: number[], fatorSazonal = 1): { valor: number | null; semanasUsadas: number; faltam: string | null } {
  const usadas = vendasMesmoDiaSemana.slice(0, SEMANAS_MAXIMAS_DEMANDA);
  if (usadas.length < SEMANAS_MINIMAS_DEMANDA) {
    return { valor: null, semanasUsadas: usadas.length, faltam: `histórico de ${SEMANAS_MINIMAS_DEMANDA} semanas do mesmo dia (há ${usadas.length})` };
  }
  const m = media(usadas);
  return { valor: m === null ? null : m * fatorSazonal, semanasUsadas: usadas.length, faltam: null };
}

export function producaoSugerida(demandaProjetadaValor: number, fatorSeguranca: number, saldoDiaAnterior: number): number {
  return Math.max(0, demandaProjetadaValor * fatorSeguranca - saldoDiaAnterior);
}

export function aderenciaCronograma(etapasConferidasNaJanela: number, etapasDoDia: number): number | null {
  return dividir(etapasConferidasNaJanela, etapasDoDia);
}

/** Uma etapa conta como conferida na janela quando foi conferida até o fim previsto. */
export function etapaConferidaNaJanela(etapa: { horaFim: Date; conferidoEm: Date | null }): boolean {
  return etapa.conferidoEm !== null && etapa.conferidoEm.getTime() <= etapa.horaFim.getTime();
}

export function desvioRendimento(rendimentoReal: number, rendimentoDeclarado: number): { desvio: number | null; alerta: boolean } {
  const desvio = dividir(rendimentoReal - rendimentoDeclarado, rendimentoDeclarado);
  return { desvio, alerta: desvio !== null && Math.abs(desvio) > LIMITE_DESVIO_RENDIMENTO };
}

export function sobraPct(sobra: number, produzido: number): number | null {
  return dividir(sobra, produzido);
}

/**
 * Sobra acima de 5% por três dias seguidos em um item: alerta com
 * sugestão de novo fator de segurança (o fator que teria zerado a sobra
 * média, limitado ao piso de 1,05).
 */
export function alertaSobraTresDias(sobrasPct: Array<number | null>, fatorAtual: number): { alerta: boolean; fatorSugerido: number | null } {
  const ultimas = sobrasPct.slice(-3);
  const alerta = ultimas.length === 3 && ultimas.every((s) => s !== null && s > LIMITE_SOBRA);
  if (!alerta) return { alerta: false, fatorSugerido: null };
  const sobraMedia = media(ultimas as number[]) ?? 0;
  const fatorSugerido = Math.max(1.05, fatorAtual * (1 - sobraMedia));
  return { alerta: true, fatorSugerido: Math.round(fatorSugerido * 100) / 100 };
}

export function refugoPct(itensRefeitos: number, itensProduzidos: number): number | null {
  return dividir(itensRefeitos, itensProduzidos);
}

export function coberturaPop(processosComPopTestado: number, processosCriticos: number): number | null {
  return dividir(processosComPopTestado, processosCriticos);
}

/** redundancia: certificados nível ≥ 2 por processo crítico; abaixo de 2 é alerta. */
export function redundancia(certificacoes: Array<{ processoId: string; nivel: number }>, processosCriticos: Array<{ id: string; nome: string }>): Array<{ processoId: string; nome: string; certificados: number; alerta: boolean }> {
  return processosCriticos.map((p) => {
    const certificados = certificacoes.filter((c) => c.processoId === p.id && c.nivel >= 2).length;
    return { processoId: p.id, nome: p.nome, certificados, alerta: certificados < MINIMO_REDUNDANCIA };
  });
}
