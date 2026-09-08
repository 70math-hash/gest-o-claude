/**
 * Utilidades numéricas do motor de cálculo.
 *
 * Percentuais circulam como fração (0,23) em todo o motor, conforme a
 * seção 5 da especificação. A conversão para "23,0%" acontece só na
 * camada de formatação (src/formato).
 */

/**
 * Arredonda em decimal, meio para cima, evitando a armadilha do ponto
 * flutuante (43,295 em binário é 43,29499..., e Math.round daria 43,29;
 * a planilha da casa e a especificação esperam 43,30).
 */
export function arredondar(valor: number, casas = 2): number {
  if (!Number.isFinite(valor)) return valor;
  const sinal = valor < 0 ? -1 : 1;
  const texto = Math.abs(valor).toFixed(casas + 8);
  const [inteiro, decimais = ""] = texto.split(".");
  const mantidos = decimais.slice(0, casas);
  const proximo = Number(decimais.charAt(casas) || "0");
  let base = Number(`${inteiro}${mantidos}`);
  if (proximo >= 5) base += 1;
  return (sinal * base) / 10 ** casas;
}

/** Divide com proteção contra divisor zero ou ausente: devolve null. */
export function dividir(numerador: number, denominador: number | null | undefined): number | null {
  if (denominador === null || denominador === undefined || denominador === 0 || !Number.isFinite(denominador)) return null;
  return numerador / denominador;
}

/** Soma uma lista de números, ignorando nulos. */
export function somar(valores: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of valores) if (typeof v === "number" && Number.isFinite(v)) total += v;
  return total;
}

/** Média aritmética; null para lista vazia. */
export function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return somar(valores) / valores.length;
}

/** Arredonda para cima ao múltiplo informado (R$ 5,00 na precificação). */
export function arredondarParaCimaMultiplo(valor: number, multiplo: number): number {
  if (multiplo <= 0) throw new Error("múltiplo precisa ser positivo");
  const razao = valor / multiplo;
  // Tolerância para 85,000000001 não virar 90.
  const razaoAjustada = Math.abs(razao - Math.round(razao)) < 1e-9 ? Math.round(razao) : Math.ceil(razao);
  return razaoAjustada * multiplo;
}

/** Garante que uma fração de rendimento está entre 0,01 e 1. */
export function validarRendimento(rendimento: number | null | undefined, contexto = "rendimento"): number {
  if (rendimento === null || rendimento === undefined || !Number.isFinite(rendimento)) {
    throw new ErroBloqueio(`${contexto} não informado; cadastro sem rendimento não salva`);
  }
  if (rendimento <= 0 || rendimento > 1) {
    throw new ErroBloqueio(`${contexto} fora da faixa: precisa estar entre 1% e 100% (fração ${rendimento})`);
  }
  return rendimento;
}

/**
 * Erro de bloqueio: a seção 8 diz que bloqueio impede salvar. O motor
 * lança este erro e a camada de aplicação traduz em recusa de gravação.
 */
export class ErroBloqueio extends Error {
  readonly tipo = "bloqueio" as const;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroBloqueio";
  }
}
