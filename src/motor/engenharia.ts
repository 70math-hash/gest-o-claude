/**
 * Seção 5.10 · Engenharia de cardápio.
 *
 * Rodar por bloco, com 90 dias de venda, nas duas matrizes.
 *
 *   Kasavana-Smith (padrão)
 *     popularidade_alta = participacao_no_mix ≥ fator × (1 / numero_de_itens_do_bloco)
 *     margem_alta       = margem_contribuicao_item ≥ margem_contribuicao_media_ponderada_do_bloco
 *   Miller (a que a casa usa hoje)
 *     popularidade_alta = mesma regra
 *     margem_alta       = cmv_teorico_item ≤ cmv_ponderado_do_bloco
 *
 * Quadrantes: estrela (alta, alta), cavalo de batalha (alta, baixa),
 * quebra-cabeça (baixa, alta), abacaxi (baixa, baixa).
 * O fator 0,70 é parâmetro editável.
 */
import { dividir } from "./numero";

export const FATOR_POPULARIDADE_PADRAO = 0.7;

export type Matriz = "kasavana_smith" | "miller";
export type Quadrante = "estrela" | "cavalo_de_batalha" | "quebra_cabeca" | "abacaxi";

export interface ItemEngenharia {
  id: string;
  nome: string;
  qtde: number;
  precoVenda: number;
  custoFicha: number;
  /** Margem de contribuição unitária (já com imposto e taxa). Necessária na Kasavana-Smith. */
  margemContribuicao: number;
}

export interface ItemClassificado extends ItemEngenharia {
  participacao: number;
  cmv: number | null;
  popularidadeAlta: boolean;
  margemAlta: boolean;
  quadrante: Quadrante;
  margem90d: number;
}

export interface ResultadoEngenharia {
  matriz: Matriz;
  fator: number;
  numeroItens: number;
  unidades: number;
  pisoPopularidadeUnidades: number;
  cmvPonderado: number | null;
  margemMediaPonderada: number | null;
  itens: ItemClassificado[];
}

export function quadrante(popularidadeAlta: boolean, margemAlta: boolean): Quadrante {
  if (popularidadeAlta && margemAlta) return "estrela";
  if (popularidadeAlta) return "cavalo_de_batalha";
  if (margemAlta) return "quebra_cabeca";
  return "abacaxi";
}

export function classificar(itens: ItemEngenharia[], matriz: Matriz, fator = FATOR_POPULARIDADE_PADRAO): ResultadoEngenharia {
  const numeroItens = itens.length;
  const unidades = itens.reduce((s, i) => s + i.qtde, 0);
  const pisoParticipacao = numeroItens === 0 ? 0 : fator * (1 / numeroItens);
  const custoTotal = itens.reduce((s, i) => s + i.custoFicha * i.qtde, 0);
  const receitaTotal = itens.reduce((s, i) => s + i.precoVenda * i.qtde, 0);
  const cmvPonderado = dividir(custoTotal, receitaTotal);
  const margemTotal = itens.reduce((s, i) => s + i.margemContribuicao * i.qtde, 0);
  const margemMediaPonderada = dividir(margemTotal, unidades);

  const classificados: ItemClassificado[] = itens.map((item) => {
    const participacao = unidades === 0 ? 0 : item.qtde / unidades;
    const popularidadeAlta = participacao >= pisoParticipacao - 1e-12;
    const cmv = dividir(item.custoFicha, item.precoVenda);
    const margemAlta =
      matriz === "kasavana_smith"
        ? margemMediaPonderada !== null && item.margemContribuicao >= margemMediaPonderada
        : cmvPonderado !== null && cmv !== null && cmv <= cmvPonderado;
    return { ...item, participacao, cmv, popularidadeAlta, margemAlta, quadrante: quadrante(popularidadeAlta, margemAlta), margem90d: item.margemContribuicao * item.qtde };
  });

  return { matriz, fator, numeroItens, unidades, pisoPopularidadeUnidades: pisoParticipacao * unidades, cmvPonderado, margemMediaPonderada, itens: classificados };
}

/** Itens que mudam de quadrante entre duas rodadas (ou entre as duas matrizes). */
export function mudancasDeQuadrante(anterior: ResultadoEngenharia, atual: ResultadoEngenharia): Array<{ id: string; nome: string; de: Quadrante; para: Quadrante }> {
  const mapa = new Map(anterior.itens.map((i) => [i.id, i.quadrante] as const));
  const mudancas: Array<{ id: string; nome: string; de: Quadrante; para: Quadrante }> = [];
  for (const item of atual.itens) {
    const de = mapa.get(item.id);
    if (de && de !== item.quadrante) mudancas.push({ id: item.id, nome: item.nome, de, para: item.quadrante });
  }
  return mudancas;
}
