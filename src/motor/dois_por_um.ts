/**
 * Seção 5.2 · Dia com 2x1.
 *
 *   custo_total   = custo das pizzas pagas + custo das pizzas gratuitas
 *   receita_bruta = soma dos preços das pizzas pagas   (nunca descontar o 2x1 da receita)
 *   cmv_2x1       = custo_total / receita_bruta
 *
 * A gratuita é identificada por combos_2x1 quando o combo é fixo e por
 * desconto de 100% na linha da venda quando o combo é livre. Sem como
 * identificar, o sistema pede confirmação manual das gratuitas do dia.
 */
import { dividir } from "./numero";

export interface PizzaPaga {
  preco: number;
  custo: number;
}

export interface PizzaGratuita {
  custo: number;
}

export function cmvDia2x1(pagas: PizzaPaga[], gratuitas: PizzaGratuita[]): {
  receitaBruta: number;
  custoPagas: number;
  custoGratuitas: number;
  custoTotal: number;
  cmv: number | null;
} {
  const receitaBruta = pagas.reduce((s, p) => s + p.preco, 0);
  const custoPagas = pagas.reduce((s, p) => s + p.custo, 0);
  const custoGratuitas = gratuitas.reduce((s, g) => s + g.custo, 0);
  const custoTotal = custoPagas + custoGratuitas;
  return { receitaBruta, custoPagas, custoGratuitas, custoTotal, cmv: dividir(custoTotal, receitaBruta) };
}

export interface LinhaVendaPizza {
  idAltec: string;
  qtde: number;
  vlTabela: number;
  descProd: number;
  descGlobal: number;
  total: number;
}

export type OrigemGratuita = "combo_fixo" | "desconto_100" | "confirmar";

/**
 * Classifica cada linha do dia como paga ou gratuita.
 * Regra: desconto de produto igual ao valor de tabela (total zero com
 * quantidade positiva) marca gratuita; produto que é a gratuita de um
 * combo fixo também. Se houver 2x1 declarado no dia e nenhuma regra
 * bater, a linha volta como "confirmar" para a tela pedir confirmação.
 */
export function identificarGratuitas(
  linhas: LinhaVendaPizza[],
  combosFixos: Array<{ idGratuito: string; idPago: string }>,
  diaTem2x1: boolean,
): Array<{ linha: LinhaVendaPizza; gratuita: boolean; origem: OrigemGratuita | null }> {
  const gratuitosFixos = new Set(combosFixos.map((c) => c.idGratuito));
  return linhas.map((linha) => {
    const desconto100 = linha.qtde > 0 && linha.total === 0 && linha.vlTabela > 0;
    if (desconto100) return { linha, gratuita: true, origem: "desconto_100" };
    if (diaTem2x1 && gratuitosFixos.has(linha.idAltec)) return { linha, gratuita: true, origem: "combo_fixo" };
    if (diaTem2x1) return { linha, gratuita: false, origem: "confirmar" };
    return { linha, gratuita: false, origem: null };
  });
}
