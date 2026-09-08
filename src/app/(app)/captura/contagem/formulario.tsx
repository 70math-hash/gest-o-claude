"use client";
import { useActionState, useEffect, useState } from "react";
import { formatarMoeda } from "@/formato";
import { RESULTADO_INICIAL } from "@/lib/acoes";
import { salvarContagem } from "./acoes";

interface Insumo {
  id: string;
  nome: string;
  unidade: string;
  curva: string | null;
  categoria: string | null;
  preco: number | null;
}

/**
 * Contagem offline-first: o rascunho fica no aparelho (localStorage) até o
 * envio, para não perder a contagem na câmara sem sinal.
 */
export function FormularioContagem({ data, tipo, base, insumos }: { data: string; tipo: string; base: string; insumos: Insumo[] }) {
  const chave = `contagem:${data}:${tipo}:${base}`;
  const [valores, setValores] = useState<Record<string, string>>({});
  const [estado, acao, pendente] = useActionState(salvarContagem, RESULTADO_INICIAL);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) setValores(JSON.parse(salvo));
    } catch {
      // sem armazenamento local: segue sem rascunho
    }
  }, [chave]);

  useEffect(() => {
    if (estado.ok) {
      try {
        localStorage.removeItem(chave);
      } catch {
        // ignora
      }
    }
  }, [estado.ok, chave]);

  function mudar(id: string, valor: string) {
    const novo = { ...valores, [id]: valor };
    setValores(novo);
    try {
      localStorage.setItem(chave, JSON.stringify(novo));
    } catch {
      // ignora
    }
  }

  const preenchidos = Object.values(valores).filter((v) => v.trim() !== "").length;
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="base" value={base} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-cinza-escuro">
        <span>
          {preenchidos} de {insumos.length} contados · rascunho salvo neste aparelho
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="fechar" defaultChecked /> fechar o inventário ao enviar
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Classe</th>
              <th className="num">Preço vigente</th>
              <th className="num">Contado</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => (
              <tr key={i.id}>
                <td>
                  <div>{i.nome}</div>
                  <div className="text-xs text-cinza-escuro">{i.categoria ?? ""}</div>
                </td>
                <td>{i.curva ?? "—"}</td>
                <td className="num">{i.preco === null ? <span className="text-cinza">sem dado</span> : `${formatarMoeda(i.preco)}/${i.unidade}`}</td>
                <td className="num">
                  <input name={`qtd:${i.id}`} inputMode="decimal" className="campo num w-24 py-1" value={valores[i.id] ?? ""} onChange={(e) => mudar(i.id, e.target.value)} placeholder={i.unidade} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "Enviando..." : "Enviar contagem"}
        </button>
        {estado.erro && <span className="text-sm">{estado.erro}</span>}
        {estado.ok && <span className="text-sm text-cinza-escuro">{estado.mensagem}</span>}
      </div>
    </form>
  );
}
