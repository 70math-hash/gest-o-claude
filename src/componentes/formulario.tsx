"use client";
import { useActionState } from "react";
import type { Resultado } from "@/lib/acoes";
import { RESULTADO_INICIAL } from "@/lib/acoes";

/** Formulário com ação de servidor, botão e mensagem de retorno. */
export function Formulario({
  acao,
  children,
  rotuloBotao = "Salvar",
  className,
}: {
  acao: (anterior: Resultado, form: FormData) => Promise<Resultado>;
  children: React.ReactNode;
  rotuloBotao?: string;
  className?: string;
}) {
  const [estado, despachar, pendente] = useActionState(acao, RESULTADO_INICIAL);
  return (
    <form action={despachar} className={className ?? "space-y-4"}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "Salvando..." : rotuloBotao}
        </button>
        {estado.erro && <span className="text-sm">{estado.erro}</span>}
        {estado.ok && estado.mensagem && <span className="text-sm text-cinza-escuro">{estado.mensagem}</span>}
      </div>
    </form>
  );
}

export function BotaoAcao({ acao, children, className }: { acao: () => Promise<void>; children: React.ReactNode; className?: string }) {
  return (
    <form action={acao} className="inline">
      <button type="submit" className={className ?? "botao-secundario px-3 py-1 text-sm"}>
        {children}
      </button>
    </form>
  );
}
