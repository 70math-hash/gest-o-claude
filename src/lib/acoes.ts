/**
 * Utilidades das ações de servidor: leitura de campos do formulário em
 * formato brasileiro e resultado padrão { ok, erro }.
 */
import { parseNumeroBr } from "@/formato";

export type Resultado = { ok: boolean; erro: string | null; mensagem?: string | null };

export function texto(form: FormData, nome: string): string | null {
  const v = form.get(nome);
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export function numeroForm(form: FormData, nome: string): number | null {
  return parseNumeroBr(texto(form, nome));
}

export function dataForm(form: FormData, nome: string): string | null {
  const t = texto(form, nome);
  if (!t) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function marcado(form: FormData, nome: string): boolean {
  const v = form.get(nome);
  return v === "on" || v === "1" || v === "true";
}

export function erro(mensagem: string): Resultado {
  return { ok: false, erro: mensagem };
}

export function ok(mensagem?: string): Resultado {
  return { ok: true, erro: null, mensagem: mensagem ?? null };
}

export const RESULTADO_INICIAL: Resultado = { ok: false, erro: null };
