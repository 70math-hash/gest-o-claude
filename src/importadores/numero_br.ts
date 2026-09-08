/**
 * Conversão de número e data no formato brasileiro (regra 9 da seção 2)
 * para o formato interno dos importadores.
 *
 * `parseNumeroBr`: "1.702,00" → 1702; "R$ 1.234,56" → 1234.56;
 * "-12,5" → -12.5; "12,5%" → 12.5; "(1.000,00)" → -1000.
 * Também aceita o formato americano que o SheetJS produz ao formatar
 * células ("1,702.50"): quando há vírgula e ponto, o último separador é o
 * decimal. Devolve null para o que não é número; nunca inventa zero
 * (regra 10).
 *
 * `parseDataBr`: dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, número serial de Excel
 * (via SSF do xlsx) ou Date → ISO aaaa-mm-dd, ou null.
 */
import * as XLSX from "xlsx";

/** Converte texto numérico brasileiro (ou número já numérico) em number; null quando não é número. */
export function parseNumeroBr(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "bigint") return Number(valor);
  if (typeof valor !== "string") return null;

  let texto = valor.replace(/\u00a0/g, " ").trim();
  if (texto === "") return null;

  let negativo = false;
  const contabil = /^\((.*)\)$/.exec(texto);
  if (contabil && contabil[1] !== undefined) {
    negativo = true;
    texto = contabil[1].trim();
  }
  texto = texto.replace(/R\$\s*/gi, "").replace(/%/g, "").trim();
  if (/^[-−–]/.test(texto)) {
    negativo = !negativo;
    texto = texto.slice(1).trim();
  } else if (texto.startsWith("+")) {
    texto = texto.slice(1).trim();
  }
  if (/[-−–]$/.test(texto)) {
    negativo = !negativo;
    texto = texto.slice(0, -1).trim();
  }
  texto = texto.replace(/\s+/g, "");
  if (!/^(?:\d[\d.,]*|[.,]\d+)$/.test(texto)) return null;

  const canonico = canonizarSeparadores(texto);
  const numero = Number(canonico);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

/** Decide qual separador é decimal e devolve o texto com ponto decimal e sem milhar. */
function canonizarSeparadores(texto: string): string {
  const ultimaVirgula = texto.lastIndexOf(",");
  const ultimoPonto = texto.lastIndexOf(".");
  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // Os dois separadores presentes: o último é o decimal.
    return ultimaVirgula > ultimoPonto ? texto.replace(/\./g, "").replace(",", ".") : texto.replace(/,/g, "");
  }
  if (ultimaVirgula >= 0) {
    // Só vírgula: decimal brasileiro ("12,5"); mais de uma vírgula é milhar americano ("1,234,567").
    return texto.indexOf(",") !== ultimaVirgula ? texto.replace(/,/g, "") : texto.replace(",", ".");
  }
  if (ultimoPonto >= 0) {
    // Só ponto: "1.702" (até três dígitos, ponto, três dígitos) é milhar brasileiro; "1.234.567" idem; o resto é decimal.
    if (texto.indexOf(".") !== ultimoPonto) return texto.replace(/\./g, "");
    return /^\d{1,3}\.\d{3}$/.test(texto) ? texto.replace(".", "") : texto;
  }
  return texto;
}

/** Converte data em texto, serial de Excel ou Date para ISO aaaa-mm-dd; null quando inválida. */
export function parseDataBr(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return isoDeDate(valor);
  if (typeof valor === "number") return isoDeSerialExcel(valor);
  if (typeof valor !== "string") return null;

  const texto = valor.trim();
  if (texto === "") return null;

  // dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, dd.mm.aaaa, com hora opcional depois.
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:[ T].*)?$/.exec(texto);
  if (m) return montarIso(Number(m[3]), Number(m[2]), Number(m[1]));

  // aaaa-mm-dd ou aaaa/mm/dd, com hora opcional depois.
  m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T].*)?$/.exec(texto);
  if (m) return montarIso(Number(m[1]), Number(m[2]), Number(m[3]));

  // Serial de Excel que chegou como texto (cinco dígitos: de 1927 a 2173).
  if (/^\d{5}(?:[.,]\d+)?$/.test(texto)) return isoDeSerialExcel(Number(texto.replace(",", ".")));

  return null;
}

/** Monta aaaa-mm-dd validando o calendário; ano de dois dígitos é 20aa. */
function montarIso(ano: number, mes: number, dia: number): string | null {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  const anoCompleto = ano < 100 ? ano + 2000 : ano;
  if (anoCompleto < 1900 || anoCompleto > 2200 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const data = new Date(Date.UTC(anoCompleto, mes - 1, dia));
  if (data.getUTCFullYear() !== anoCompleto || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${anoCompleto}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Serial de Excel (dias desde 1899-12-30, sistema 1900) via SSF do xlsx. */
function isoDeSerialExcel(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const resultado: unknown = XLSX.SSF.parse_date_code(serial);
  if (!resultado || typeof resultado !== "object") return null;
  const { y, m, d } = resultado as { y?: unknown; m?: unknown; d?: unknown };
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") return null;
  return montarIso(y, m, d);
}

/**
 * Date → aaaa-mm-dd. Um Date exatamente à meia-noite UTC é uma data de
 * calendário sem hora (vinda de "aaaa-mm-dd") e usa os campos UTC; qualquer
 * outro usa os campos locais, que é como o SheetJS constrói datas.
 */
function isoDeDate(data: Date): string | null {
  if (Number.isNaN(data.getTime())) return null;
  const meiaNoiteUtc = data.getUTCHours() === 0 && data.getUTCMinutes() === 0 && data.getUTCSeconds() === 0 && data.getUTCMilliseconds() === 0;
  if (meiaNoiteUtc) return montarIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
  return montarIso(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

/**
 * Hora em texto ("19:30", "19:30:00", "19h30", "05/04/2026 19:30"), fração
 * de dia do Excel (0,8125) ou Date → "HH:MM"; null quando não há hora.
 */
export function parseHoraBr(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return `${String(valor.getHours()).padStart(2, "0")}:${String(valor.getMinutes()).padStart(2, "0")}`;
  }
  if (typeof valor === "number") return horaDeFracao(valor);
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto === "") return null;
  const m = /(?:^|\D)(\d{1,2})[:h](\d{2})(?::(\d{2}))?(?:\D|$)/i.exec(texto);
  if (m) {
    const horas = Number(m[1]);
    const minutos = Number(m[2]);
    if (horas > 23 || minutos > 59) return null;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  }
  if (/^\d*[.,]\d+$/.test(texto)) return horaDeFracao(Number(texto.replace(",", ".")));
  return null;
}

function horaDeFracao(valor: number): string | null {
  if (!Number.isFinite(valor) || valor < 0) return null;
  const fracao = valor - Math.floor(valor);
  if (fracao === 0 && valor >= 1) return null; // serial de data sem hora
  const minutosTotais = Math.round(fracao * 1440) % 1440;
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}
