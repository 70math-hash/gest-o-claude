/**
 * Proxy do Next.js (antigo middleware): renova a sessão do Supabase a cada
 * requisição e manda quem não está logado para /entrar.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/entrar", "/auth/callback", "/sem-acesso", "/manifest.webmanifest", "/icone.svg"];

export async function proxy(requisicao: NextRequest) {
  if (process.env.MODO_LOCAL === "1") return NextResponse.next();
  let resposta = NextResponse.next({ request: requisicao });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return resposta;
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return requisicao.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) requisicao.cookies.set(name, value);
        resposta = NextResponse.next({ request: requisicao });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const caminho = requisicao.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => caminho.startsWith(p));
  if (!data.user && !publica) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  if (data.user && caminho === "/entrar") {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/hoje";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
