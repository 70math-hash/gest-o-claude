/**
 * Acesso a dados: um cliente Supabase por requisição, sempre no contexto da
 * sessão (RLS decide o que aparece). Funções SQL da seção 4.3 via rpc.
 */
import { clienteServidor } from "@/lib/supabase/servidor";
import { sessaoAtual } from "@/lib/sessao";

export async function bd() {
  const [supabase, sessao] = await Promise.all([clienteServidor(), sessaoAtual()]);
  return { supabase, sessao };
}

export function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export class ErroDados extends Error {}

export function lancar(erro: { message: string } | null, contexto: string): void {
  if (erro) throw new ErroDados(`${contexto}: ${erro.message}`);
}

/** Chama uma função SQL (view parametrizada) e devolve as linhas. */
export async function rpc<T = Record<string, unknown>>(nome: string, parametros: Record<string, unknown>): Promise<T[]> {
  const { supabase } = await bd();
  const { data, error } = await supabase.rpc(nome, parametros);
  lancar(error, nome);
  return (data ?? []) as T[];
}

export async function rpcUm<T = Record<string, unknown>>(nome: string, parametros: Record<string, unknown>): Promise<T | null> {
  const linhas = await rpc<T>(nome, parametros);
  return linhas[0] ?? null;
}
