/**
 * Formatação brasileira (regra 9): R$ 1.234,56, dd/mm/aaaa, percentual com
 * vírgula, fuso America/Sao_Paulo, semana operacional de terça a domingo.
 * Único lugar do sistema que converte número em texto para a interface.
 */

export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numeroCache = new Map<string, Intl.NumberFormat>();

function formatadorNumero(min: number, max: number): Intl.NumberFormat {
  const chave = `${min}-${max}`;
  let f = numeroCache.get(chave);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });
    numeroCache.set(chave, f);
  }
  return f;
}

/** Texto padrão para indicador sem dado (regra 10). */
export const SEM_DADO = "sem dado";

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return SEM_DADO;
  return moeda.format(valor).replace(/ /g, " ");
}

export function formatarNumero(valor: number | null | undefined, casas = 2, casasMinimas = casas): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return SEM_DADO;
  return formatadorNumero(casasMinimas, casas).format(valor);
}

export function formatarInteiro(valor: number | null | undefined): string {
  return formatarNumero(valor, 0, 0);
}

/** Fração (0,23) vira "23,0%". */
export function formatarPercentual(fracao: number | null | undefined, casas = 1): string {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return SEM_DADO;
  return `${formatadorNumero(casas, casas).format(fracao * 100)}%`;
}

/** Diferença em pontos percentuais: 0,021 vira "+2,1 p.p.". */
export function formatarPontos(fracao: number | null | undefined, casas = 1): string {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return SEM_DADO;
  const sinal = fracao > 0 ? "+" : "";
  return `${sinal}${formatadorNumero(casas, casas).format(fracao * 100)} p.p.`;
}

/** Quantidade com unidade: 0,35 kg vira "350 g"; 1 un vira "1 un". */
export function formatarQuantidade(quantidade: number | null | undefined, unidade: string): string {
  if (quantidade === null || quantidade === undefined || !Number.isFinite(quantidade)) return SEM_DADO;
  if (unidade === "kg" && Math.abs(quantidade) < 1) return `${formatarNumero(quantidade * 1000, 1, 0)} g`;
  if (unidade === "l" && Math.abs(quantidade) < 1) return `${formatarNumero(quantidade * 1000, 0, 0)} ml`;
  return `${formatarNumero(quantidade, 3, 0)} ${unidade}`;
}

const partesData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const partesDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const partesHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

/** Aceita Date, ISO (aaaa-mm-dd ou completo) ou null. */
export function formatarData(valor: Date | string | null | undefined): string {
  const d = paraData(valor);
  if (!d) return SEM_DADO;
  return partesData.format(d);
}

export function formatarDataHora(valor: Date | string | null | undefined): string {
  const d = paraData(valor);
  if (!d) return SEM_DADO;
  return partesDataHora.format(d).replace(",", "");
}

export function formatarHora(valor: Date | string | null | undefined): string {
  const d = paraData(valor);
  if (!d) return SEM_DADO;
  return partesHora.format(d);
}

/** Data ISO de calendário (aaaa-mm-dd) vira dd/mm/aaaa sem passar por fuso. */
export function formatarDataIso(iso: string | null | undefined): string {
  if (!iso) return SEM_DADO;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return formatarData(iso);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function paraData(valor: Date | string | null | undefined): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  // Data de calendário sem hora: interpretar em São Paulo ao meio-dia para não virar o dia anterior.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00-03:00`);
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Data de calendário de hoje em São Paulo, como aaaa-mm-dd. */
export function hojeIso(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(agora);
  const pegar = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
}

/** Converte dd/mm/aaaa (ou dd/mm/aa) em aaaa-mm-dd. Null se inválido. */
export function isoDeDataBr(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/.exec(texto);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let ano = Number(m[3]);
  if (ano < 100) ano += 2000;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"] as const;

/** 0 = domingo ... 6 = sábado, para uma data de calendário aaaa-mm-dd. */
export function diaDaSemanaIso(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function nomeDiaSemana(iso: string): string {
  return DIAS_SEMANA[diaDaSemanaIso(iso)] ?? "";
}

/** Soma dias a uma data de calendário aaaa-mm-dd. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const data = new Date(Date.UTC(a, m - 1, d + dias));
  return data.toISOString().slice(0, 10);
}

/** A casa fecha na segunda. */
export function diaDeOperacao(iso: string): boolean {
  return diaDaSemanaIso(iso) !== 1;
}

/**
 * Semana operacional de terça a domingo. Para uma data qualquer devolve
 * a terça que abre a semana e o domingo que fecha. A segunda (fechada)
 * pertence à semana que termina no domingo seguinte, porque é o dia da
 * contagem e da reunião semanal (seção 9).
 */
export function semanaOperacional(iso: string): { inicio: string; fim: string } {
  const dia = diaDaSemanaIso(iso);
  // distância até a terça (2) anterior ou igual; segunda (1) avança para a terça seguinte.
  const atras = dia === 1 ? -1 : (dia - 2 + 7) % 7;
  const inicio = somarDias(iso, -atras);
  return { inicio, fim: somarDias(inicio, 5) };
}

export function mesDeReferencia(iso: string): { inicio: string; fim: string; competencia: string } {
  const [a, m] = iso.split("-").map(Number) as [number, number];
  const inicio = `${a}-${String(m).padStart(2, "0")}-01`;
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { inicio, fim: `${a}-${String(m).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`, competencia: `${String(m).padStart(2, "0")}/${a}` };
}

export function formatarCompetencia(iso: string): string {
  const [a, m] = iso.split("-").map(Number) as [number, number];
  return `${MESES[m - 1]} de ${a}`;
}
