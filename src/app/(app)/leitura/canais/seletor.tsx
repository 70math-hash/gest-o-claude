"use client";
import { useRouter } from "next/navigation";

export function SeletorProduto({ produtos, produtoId, data }: { produtos: Array<{ id: string; nome: string; bloco: string }>; produtoId: string; data: string }) {
  const roteador = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select className="campo w-auto py-1" value={produtoId} onChange={(e) => roteador.push(`/leitura/canais?produto=${e.target.value}&data=${data}`)}>
        {produtos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome} ({p.bloco})
          </option>
        ))}
      </select>
      <input type="date" className="campo w-auto py-1" value={data} onChange={(e) => e.target.value && roteador.push(`/leitura/canais?produto=${produtoId}&data=${e.target.value}`)} />
    </div>
  );
}
