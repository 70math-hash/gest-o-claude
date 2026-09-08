"use client";
import { useRouter, usePathname } from "next/navigation";
import { formatarDataIso, nomeDiaSemana, somarDias, diaDeOperacao } from "@/formato";

/** Navegação de data por querystring (?data=aaaa-mm-dd), com nome do dia. */
export function SeletorData({ data, parametro = "data", passo = 1 }: { data: string; parametro?: string; passo?: number }) {
  const roteador = useRouter();
  const caminho = usePathname();
  function ir(nova: string) {
    const p = new URLSearchParams(window.location.search);
    p.set(parametro, nova);
    roteador.push(`${caminho}?${p.toString()}`);
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(somarDias(data, -passo))} aria-label="dia anterior">
        ‹
      </button>
      <label className="flex items-center gap-2">
        <input type="date" value={data} onChange={(e) => e.target.value && ir(e.target.value)} className="campo w-auto py-1" />
        <span className="text-cinza-escuro">
          {nomeDiaSemana(data)}
          {!diaDeOperacao(data) && " (fechado)"}
        </span>
      </label>
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(somarDias(data, passo))} aria-label="dia seguinte">
        ›
      </button>
      <span className="sr-only">{formatarDataIso(data)}</span>
    </div>
  );
}
