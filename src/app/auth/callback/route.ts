/** Troca o código do link mágico pela sessão e segue para a tela do dia. */
import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function GET(requisicao: NextRequest) {
  const codigo = requisicao.nextUrl.searchParams.get("code");
  const proximo = requisicao.nextUrl.searchParams.get("proximo") ?? "/hoje";
  if (codigo) {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(proximo, requisicao.url));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", requisicao.url));
}
