/**
 * Seção 5.7 · Gente.
 *
 *   folha_pct             = folha_com_encargos / receita_bruta
 *   receita_por_hora      = receita_dia / horas_trabalhadas_equipe
 *   pratos_por_cozinheiro = pratos_produzidos / cozinheiros_no_turno
 *   receita_por_garcom    = receita_das_mesas_atendidas / garcons_no_turno
 *   horas_extras_pct      = valor_horas_extras / folha_total
 *   absenteismo           = faltas_nao_programadas / dias_escalados
 *   turnover_dieese       = min(admissoes, desligamentos) / efetivo_medio          (padrão do sistema)
 *   turnover_interno      = ((admissoes + desligamentos) / 2) / efetivo_medio      (exibido como alternativo)
 *   tempo_medio_casa      = média de meses entre admissão e hoje ou desligamento
 *
 * O sistema mostra qual fórmula de turnover está em uso e nunca compara
 * direto com o número do setor.
 */
import { dividir, media } from "./numero";

export const LIMITE_HORAS_EXTRAS = 0.05;

export function folhaPct(folhaComEncargos: number, receitaBruta: number): number | null {
  return dividir(folhaComEncargos, receitaBruta);
}

export function receitaPorHora(receitaDia: number, horasTrabalhadasEquipe: number): number | null {
  return dividir(receitaDia, horasTrabalhadasEquipe);
}

export function pratosPorCozinheiro(pratosProduzidos: number, cozinheirosNoTurno: number): number | null {
  return dividir(pratosProduzidos, cozinheirosNoTurno);
}

export function receitaPorGarcom(receitaDasMesasAtendidas: number, garconsNoTurno: number): number | null {
  return dividir(receitaDasMesasAtendidas, garconsNoTurno);
}

export function horasExtrasPct(valorHorasExtras: number, folhaTotal: number): { valor: number | null; alerta: boolean } {
  const valor = dividir(valorHorasExtras, folhaTotal);
  return { valor, alerta: valor !== null && valor > LIMITE_HORAS_EXTRAS };
}

export function absenteismo(faltasNaoProgramadas: number, diasEscalados: number): number | null {
  return dividir(faltasNaoProgramadas, diasEscalados);
}

export function turnoverDieese(admissoes: number, desligamentos: number, efetivoMedio: number): number | null {
  return dividir(Math.min(admissoes, desligamentos), efetivoMedio);
}

export function turnoverInterno(admissoes: number, desligamentos: number, efetivoMedio: number): number | null {
  return dividir((admissoes + desligamentos) / 2, efetivoMedio);
}

/** Meses entre admissão e desligamento (ou a data de referência), média do efetivo. */
export function tempoMedioCasa(colaboradores: Array<{ admissao: Date; desligamento: Date | null }>, referencia: Date): number | null {
  const meses = colaboradores.map((c) => {
    const fim = c.desligamento ?? referencia;
    return (fim.getTime() - c.admissao.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  });
  return media(meses);
}

/** Horas trabalhadas e extras de um dia de escala, a partir do realizado. */
export function horasDoDia(escala: { entrada: Date; saida: Date; realizadoEntrada: Date | null; realizadoSaida: Date | null }): { previstas: number; trabalhadas: number | null; extras: number | null } {
  const previstas = (escala.saida.getTime() - escala.entrada.getTime()) / 3_600_000;
  if (!escala.realizadoEntrada || !escala.realizadoSaida) return { previstas, trabalhadas: null, extras: null };
  const trabalhadas = (escala.realizadoSaida.getTime() - escala.realizadoEntrada.getTime()) / 3_600_000;
  return { previstas, trabalhadas, extras: Math.max(0, trabalhadas - previstas) };
}
