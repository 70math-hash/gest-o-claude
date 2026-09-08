import { Suspense } from "react";
import { formatarDataHora, formatarDataIso, hojeIso, nomeDiaSemana } from "@/formato";
import { checklistModelo, checklistsDoDia } from "@/lib/dados/captura";
import { Secao, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { Formulario } from "@/componentes/formulario";
import { assinarChecklist } from "./acoes";

export const metadata = { title: "Checklist de praça" };

export default async function PaginaChecklist({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const [modelos, feitos] = await Promise.all([checklistModelo(), checklistsDoDia(data)]);
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · 2 minutos`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Checklist de praça
      </Titulo>
      {modelos.length === 0 && <div className="text-sm text-cinza-escuro">sem dado: nenhum modelo de checklist cadastrado.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {modelos.map((m) => {
          const feito = feitos.find((f) => f.praca === m.praca && f.tipo === m.tipo);
          return (
            <Secao key={`${m.praca}-${m.tipo}`} titulo={`${m.praca} · ${m.tipo}`} descricao={feito ? `assinado em ${formatarDataHora(feito.assinadoEm)}` : "não assinado"}>
              {feito ? (
                <ul className="space-y-1 text-sm">
                  {feito.itens.map((i) => (
                    <li key={i.item} className={i.ok ? "" : "font-medium"}>
                      {i.ok ? "✓" : "✗"} {i.item}
                    </li>
                  ))}
                </ul>
              ) : (
                <Formulario acao={assinarChecklist} rotuloBotao="Assinar" className="space-y-2">
                  <input type="hidden" name="data" value={data} />
                  <input type="hidden" name="praca" value={m.praca} />
                  <input type="hidden" name="tipo" value={m.tipo} />
                  {m.itens.map((item, i) => (
                    <label key={item} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" name={`item:${i}`} className="mt-1" />
                      <input type="hidden" name={`rotulo:${i}`} value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </Formulario>
              )}
            </Secao>
          );
        })}
      </div>
    </>
  );
}
