"use client";
import { usePathname, useRouter } from "next/navigation";
import { formatarDataIso, somarDias } from "@/formato";

/** Navegação de período (semana ou trimestre) por querystring. */
export function SeletorPeriodo({ inicio, fim, passoDias, parametro = "data" }: { inicio: string; fim: string; passoDias: number; parametro?: string }) {
  const roteador = useRouter();
  const caminho = usePathname();
  function ir(nova: string) {
    const p = new URLSearchParams(window.location.search);
    p.set(parametro, nova);
    roteador.push(`${caminho}?${p.toString()}`);
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(somarDias(fim, -passoDias))} aria-label="período anterior">‹</button>
      <span className="num">
        {formatarDataIso(inicio)} a {formatarDataIso(fim)}
      </span>
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(somarDias(fim, passoDias))} aria-label="período seguinte">›</button>
    </div>
  );
}

export function SeletorMes({ competencia }: { competencia: string }) {
  const roteador = useRouter();
  const caminho = usePathname();
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  function ir(delta: number) {
    const d = new Date(Date.UTC(ano, mes - 1 + delta, 1));
    roteador.push(`${caminho}?mes=${d.toISOString().slice(0, 7)}`);
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(-1)} aria-label="mês anterior">‹</button>
      <input type="month" value={competencia} onChange={(e) => e.target.value && roteador.push(`${caminho}?mes=${e.target.value}`)} className="campo w-auto py-1" />
      <button type="button" className="botao-secundario px-3 py-1" onClick={() => ir(1)} aria-label="mês seguinte">›</button>
    </div>
  );
}
