/**
 * Simples Nacional · alíquota efetiva (decisão D-008).
 *
 * A casa voltou ao Simples. O imposto sobre venda do sistema é a alíquota
 * efetiva do Anexo I (comércio, onde bares e restaurantes se enquadram):
 *
 *   aliquota_efetiva = (RBT12 × aliquota_nominal − parcela_a_deduzir) / RBT12
 *
 * RBT12 é a receita bruta acumulada dos doze meses anteriores. Tabela da
 * LC 123/2006 com a redação da LC 155/2016, vigente desde 2018.
 */

export interface FaixaSimples {
  ate: number;
  aliquotaNominal: number;
  deduzir: number;
}

export const ANEXO_I: FaixaSimples[] = [
  { ate: 180_000, aliquotaNominal: 0.04, deduzir: 0 },
  { ate: 360_000, aliquotaNominal: 0.073, deduzir: 5_940 },
  { ate: 720_000, aliquotaNominal: 0.095, deduzir: 13_860 },
  { ate: 1_800_000, aliquotaNominal: 0.107, deduzir: 22_500 },
  { ate: 3_600_000, aliquotaNominal: 0.143, deduzir: 87_300 },
  { ate: 4_800_000, aliquotaNominal: 0.19, deduzir: 378_000 },
];

export const TETO_SIMPLES = 4_800_000;

export function faixaSimples(rbt12: number, tabela: FaixaSimples[] = ANEXO_I): { numero: number; faixa: FaixaSimples } | null {
  if (rbt12 < 0 || rbt12 > TETO_SIMPLES) return null;
  for (let i = 0; i < tabela.length; i++) {
    const faixa = tabela[i]!;
    if (rbt12 <= faixa.ate) return { numero: i + 1, faixa };
  }
  return null;
}

/** Alíquota efetiva como fração. Null fora do Simples (acima do teto). */
export function aliquotaEfetivaSimples(rbt12: number, tabela: FaixaSimples[] = ANEXO_I): number | null {
  const encontrada = faixaSimples(rbt12, tabela);
  if (!encontrada) return null;
  if (rbt12 === 0) return encontrada.faixa.aliquotaNominal;
  return (rbt12 * encontrada.faixa.aliquotaNominal - encontrada.faixa.deduzir) / rbt12;
}
