"use client";
import { useState } from "react";
import { aliquotaEfetivaSimples, faixaSimples } from "@/motor/simples";
import { formatarMoeda, formatarPercentual, parseNumeroBr } from "@/formato";

/** Calculadora da alíquota efetiva do Simples Nacional, Anexo I. */
export function CalculadoraSimples() {
  const [texto, setTexto] = useState("");
  const rbt12 = parseNumeroBr(texto);
  const aliquota = rbt12 !== null ? aliquotaEfetivaSimples(rbt12) : null;
  const faixa = rbt12 !== null ? faixaSimples(rbt12) : null;
  return (
    <div className="border border-cinza-claro bg-branco p-3 text-sm">
      <div className="text-xs uppercase tracking-wider text-cinza-escuro">Calculadora do Simples (Anexo I)</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className="campo num w-48 py-1" inputMode="decimal" placeholder="RBT12 em R$" value={texto} onChange={(e) => setTexto(e.target.value)} />
        {rbt12 !== null && (
          <span className="num">
            {aliquota === null ? "acima do teto do Simples (R$ 4.800.000,00)" : `${faixa?.numero}ª faixa · nominal ${formatarPercentual(faixa?.faixa.aliquotaNominal ?? 0, 2)} − ${formatarMoeda(faixa?.faixa.deduzir ?? 0)} = efetiva ${formatarPercentual(aliquota, 2)}`}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-cinza-escuro">aliquota_efetiva = (RBT12 × alíquota nominal − parcela a deduzir) / RBT12</div>
    </div>
  );
}
