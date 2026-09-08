/**
 * Seção 5.8 · Salão e receita.
 *
 *   ticket_medio     = receita_bruta / clientes
 *   giro_por_cadeira = clientes_atendidos / cadeiras       (já embute a ocupação)
 *   giro_por_mesa    = atendimentos / mesas
 *   taxa_ocupacao    = cadeiras_ocupadas / cadeiras        (diagnóstico, nunca multiplicar pelo giro)
 *   attach_entrada   = mesas com entrada / mesas atendidas
 *   attach_sobremesa = mesas com sobremesa / mesas atendidas
 *   attach_bebida    = mesas com bebida / mesas atendidas
 *   tempo_a_mesa     = saida − chegada
 *   no_show          = reservas não comparecidas / reservas confirmadas
 *   base_que_retorna = clientes com mais de uma visita / clientes únicos
 *   retencao_90d     = clientes novos que voltaram em 90 dias / clientes novos
 *
 * Capacidade horária do forno é medida, nunca extrapolada: soma das quatro
 * faixas de 15 minutos de uma hora cheia de pico; o pico de 15 minutos é
 * guardado separado.
 *
 * Confirmado pelo Matheus em 07/09/2026 (D-005), impacto do attach:
 *   mesas_a_mais    = mesas × (attach_alvo − attach_atual)
 *   ganho_por_noite = mesas_a_mais × margem_contribuicao_item
 *   ganho_periodo   = ganho_por_noite × noites
 */
import { dividir } from "./numero";

export function ticketMedio(receitaBruta: number, clientes: number): number | null {
  return dividir(receitaBruta, clientes);
}

export function giroPorCadeira(clientesAtendidos: number, cadeiras: number): number | null {
  return dividir(clientesAtendidos, cadeiras);
}

export function giroPorMesa(atendimentos: number, mesas: number): number | null {
  return dividir(atendimentos, mesas);
}

export function taxaOcupacao(cadeirasOcupadas: number, cadeiras: number): number | null {
  return dividir(cadeirasOcupadas, cadeiras);
}

export interface AtendimentoParaAttach {
  teveEntrada: boolean;
  teveSobremesa: boolean;
  teveBebida: boolean;
}

export function attach(atendimentos: AtendimentoParaAttach[]): { entrada: number | null; sobremesa: number | null; bebida: number | null; mesas: number } {
  const n = atendimentos.length;
  return {
    mesas: n,
    entrada: dividir(atendimentos.filter((a) => a.teveEntrada).length, n),
    sobremesa: dividir(atendimentos.filter((a) => a.teveSobremesa).length, n),
    bebida: dividir(atendimentos.filter((a) => a.teveBebida).length, n),
  };
}

/** tempo_a_mesa em minutos. */
export function tempoAMesa(chegada: Date, saida: Date): number {
  return (saida.getTime() - chegada.getTime()) / 60_000;
}

export function noShow(reservasNaoComparecidas: number, reservasConfirmadas: number): number | null {
  return dividir(reservasNaoComparecidas, reservasConfirmadas);
}

export function baseQueRetorna(clientesComMaisDeUmaVisita: number, clientesUnicos: number): number | null {
  return dividir(clientesComMaisDeUmaVisita, clientesUnicos);
}

export function retencao90d(clientesNovosQueVoltaramEm90d: number, clientesNovos: number): number | null {
  return dividir(clientesNovosQueVoltaramEm90d, clientesNovos);
}

/** Capacidade do forno: quatro faixas de 15 minutos medidas numa hora cheia de pico. */
export function capacidadeForno(faixas15min: [number, number, number, number]): { pizzasPorHora: number; pico15min: number } {
  return { pizzasPorHora: faixas15min.reduce((s, f) => s + f, 0), pico15min: Math.max(...faixas15min) };
}

export function impactoAttach(params: { mesas: number; attachAtual: number; attachAlvo: number; margemContribuicaoItem: number; noites: number }): { mesasAMais: number; ganhoPorNoite: number; ganhoPeriodo: number } {
  const mesasAMais = params.mesas * (params.attachAlvo - params.attachAtual);
  const ganhoPorNoite = mesasAMais * params.margemContribuicaoItem;
  return { mesasAMais, ganhoPorNoite, ganhoPeriodo: ganhoPorNoite * params.noites };
}
