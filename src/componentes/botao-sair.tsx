"use client";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function BotaoSair() {
  const roteador = useRouter();
  async function sair() {
    if (process.env.NEXT_PUBLIC_MODO_LOCAL === "1") return;
    await clienteNavegador().auth.signOut();
    roteador.push("/entrar");
    roteador.refresh();
  }
  return (
    <button type="button" onClick={sair} className="botao-secundario text-sm">
      Sair
    </button>
  );
}
