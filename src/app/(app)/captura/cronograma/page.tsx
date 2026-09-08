import { Suspense } from "react";
import { formatarDataIso, formatarHora, formatarPercentual, hojeIso, nomeDiaSemana } from "@/formato";
import { cronogramaDoDia } from "@/lib/dados/captura";
import { Indicador, Secao, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { conferirEtapa, desfazerConferido } from "./acoes";

export const metadata = { title: "Cronograma" };

export default async function PaginaCronograma({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const etapas = await cronogramaDoDia(data);
  const naJanela = etapas.filter((e) => e.conferidoEm && new Date(e.conferidoEm).getTime() <= new Date(e.horaFim).getTime()).length;
  const aderencia = etapas.length > 0 ? naJanela / etapas.length : null;
  const agora = Date.now();
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · 10 segundos por etapa`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Cronograma
      </Titulo>
      <div className="mb-6 max-w-sm">
        <Indicador codigo="aderencia_cronograma" nome="Aderência do dia" valor={aderencia} tipo="pct" meta={0.95} semaforo={aderencia === null ? null : aderencia >= 0.95 ? "otimo" : aderencia >= 0.9 ? "atencao" : aderencia >= 0.8 ? "alerta" : "critico"} falta="etapas do dia (modelo em Cadastro › Cronograma)" detalhe={`${naJanela} de ${etapas.length} conferidas dentro da janela`} />
      </div>
      <Secao titulo="Etapas do dia" descricao="Conferido dentro da janela conta para a aderência; fora dela é atraso.">
        {etapas.length === 0 && <div className="text-sm text-cinza-escuro">sem dado: nenhuma etapa no modelo para este dia da semana.</div>}
        <ul className="divide-y divide-cinza-claro border border-cinza-claro bg-branco">
          {etapas.map((e) => {
            const fim = new Date(e.horaFim).getTime();
            const conferida = Boolean(e.conferidoEm);
            const atrasada = !conferida && agora > fim && data === hojeIso();
            const foraJanela = conferida && new Date(e.conferidoEm as string).getTime() > fim;
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className={`text-sm ${conferida ? "text-cinza-escuro line-through" : ""}`}>{e.etapa}</div>
                  <div className="num text-xs text-cinza-escuro">
                    {formatarHora(e.horaInicio)} às {formatarHora(e.horaFim)}
                    {e.praca && ` · ${e.praca}`}
                    {conferida && ` · conferido ${formatarHora(e.conferidoEm)}${foraJanela ? " (fora da janela)" : ""}`}
                    {atrasada && " · atrasada"}
                  </div>
                </div>
                {conferida ? (
                  <form action={desfazerConferido.bind(null, e.id, data)}>
                    <button className="text-xs underline">desfazer</button>
                  </form>
                ) : (
                  <form action={conferirEtapa.bind(null, e.id, data)}>
                    <button className="botao px-3 py-2 text-sm">Conferido</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {aderencia !== null && aderencia < 0.95 && <div className="mt-3 text-sm">Aderência abaixo de 95%: {formatarPercentual(aderencia)}. Etapas fora da janela: {etapas.filter((e) => !e.conferidoEm || new Date(e.conferidoEm).getTime() > new Date(e.horaFim).getTime()).map((e) => e.etapa).join(", ")}.</div>}
      </Secao>
    </>
  );
}
