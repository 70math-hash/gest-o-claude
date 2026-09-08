"use client";
import { useActionState } from "react";
import { marcarIndisponivel, removerIndisponivel } from "./acoes";

export function FormularioIndisponivel({ data, produtos }: { data: string; produtos: Array<{ id: string; nome: string }> }) {
  const [estado, acao, pendente] = useActionState(marcarIndisponivel, { erro: null });
  return (
    <form action={acao} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
      <input type="hidden" name="data" value={data} />
      <label className="flex-1">
        <span className="text-xs text-cinza-escuro">Produto</span>
        <select name="produto_id" required className="campo mt-1 py-1">
          <option value="">escolha</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1">
        <span className="text-xs text-cinza-escuro">Motivo</span>
        <input name="motivo" className="campo mt-1 py-1" placeholder="falta de insumo, 86..." />
      </label>
      <button type="submit" className="botao py-1" disabled={pendente}>
        Marcar
      </button>
      {estado.erro && <div className="w-full text-xs">{estado.erro}</div>}
    </form>
  );
}

export function BotaoRemoverIndisponivel({ id, data }: { id: string; data: string }) {
  return (
    <form action={removerIndisponivel.bind(null, id, data)}>
      <button type="submit" className="text-xs underline">
        liberar
      </button>
    </form>
  );
}
