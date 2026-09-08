/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Em MODO_LOCAL (desenvolvimento sem projeto Supabase), fala com um
 * PostgREST local usando um JWT fixo do dono; a autenticação é simulada.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const MODO_LOCAL = process.env.MODO_LOCAL === "1";

function configuracao() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados");
  return { url, chave };
}

export async function clienteServidor(): Promise<SupabaseClient> {
  const { url, chave } = configuracao();
  if (MODO_LOCAL) {
    // PostgREST local não tem o prefixo /rest/v1 do Supabase: reescreve a URL.
    const jwt = process.env.LOCAL_JWT ?? "";
    const buscar: typeof fetch = (entrada, init) => {
      const destino = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.toString() : entrada.url;
      return fetch(destino.replace("/rest/v1/", "/"), init);
    };
    return createClient(url, chave, { global: { headers: { Authorization: `Bearer ${jwt}` }, fetch: buscar }, auth: { persistSession: false, autoRefreshToken: false } });
  }
  const armazem = await cookies();
  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) armazem.set(name, value, options);
        } catch {
          // Em Server Components a escrita de cookie é ignorada; o proxy renova a sessão.
        }
      },
    },
  });
}
