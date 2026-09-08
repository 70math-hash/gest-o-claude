"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function FormularioEntrar() {
  const parametros = useSearchParams();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");
  const [mensagem, setMensagem] = useState<string | null>(parametros.get("erro") === "link" ? "O link expirou ou já foi usado. Peça outro." : null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado("enviando");
    setMensagem(null);
    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setEstado("erro");
      setMensagem(error.message);
      return;
    }
    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div className="border border-cinza p-4 text-sm">
        <p className="font-medium">Link enviado para {email}.</p>
        <p className="mt-2 text-cinza">Abra o e-mail neste aparelho e toque no link para entrar. Sem senha.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">E-mail</span>
        <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="campo mt-1" placeholder="seu@email.com" />
      </label>
      <button type="submit" disabled={estado === "enviando"} className="botao w-full">
        {estado === "enviando" ? "Enviando..." : "Receber link de acesso"}
      </button>
      {mensagem && <p className="text-sm text-preto">{mensagem}</p>}
      <p className="text-xs text-cinza">Só entram e-mails autorizados pelo dono. Quatro perfis: dono, gestor, cozinha e salão.</p>
    </form>
  );
}
