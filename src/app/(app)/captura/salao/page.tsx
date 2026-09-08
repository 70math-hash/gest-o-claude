import { Suspense } from "react";
import { formatarDataIso, formatarHora, formatarInteiro, formatarMoeda, hojeIso, nomeDiaSemana } from "@/formato";
import { reservasDoDia } from "@/lib/dados/hoje";
import { atendimentosDoDia } from "@/lib/dados/captura";
import { listarColaboradores } from "@/lib/dados/cadastro";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { Formulario } from "@/componentes/formulario";
import { mudarStatusReserva, salvarAtendimento, salvarReserva } from "./acoes";

export const metadata = { title: "Reservas e salão" };

const STATUS: Record<string, string> = { confirmada: "confirmada", compareceu: "compareceu", no_show: "no-show", cancelada: "cancelada" };

export default async function PaginaSalao({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const [reservas, atendimentos, colaboradores] = await Promise.all([reservasDoDia(data), atendimentosDoDia(data), listarColaboradores()]);
  const garcons = colaboradores.filter((c) => /gar[cç]o|salao|salão|atend/i.test(c.cargo) || c.praca === "salao");
  const sim = (v: boolean | null) => (v === null ? "—" : v ? "sim" : "não");
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · por atendimento`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Reservas e salão
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Reservas" descricao="no_show = reservas não comparecidas / reservas confirmadas">
          <Formulario acao={salvarReserva} rotuloBotao="Reservar" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input type="hidden" name="data" value={data} />
            <Campo rotulo="Hora"><input type="time" name="hora" className="campo py-1" required /></Campo>
            <Campo rotulo="Pessoas"><input name="pessoas" className="campo num py-1" inputMode="numeric" required /></Campo>
            <Campo rotulo="Nome"><input name="nome" className="campo py-1" /></Campo>
            <Campo rotulo="Mesa"><input name="mesa" className="campo py-1" /></Campo>
          </Formulario>
          <div className="mt-4">
            <Tabela cabecalho={[{ rotulo: "Hora" }, { rotulo: "Nome" }, { rotulo: "Pessoas", num: true }, { rotulo: "Mesa" }, { rotulo: "Status" }, { rotulo: "" }]} vazio={reservas.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem reservas para o dia</div> : null}>
              {reservas.map((r) => (
                <tr key={r.id}>
                  <Td>{r.hora}</Td>
                  <Td>{r.nome ?? ""}</Td>
                  <Td num>{formatarInteiro(r.pessoas)}</Td>
                  <Td>{r.mesa ?? ""}</Td>
                  <Td>{STATUS[r.status] ?? r.status}</Td>
                  <Td>
                    <div className="flex gap-2 text-xs">
                      {r.status === "confirmada" && (
                        <>
                          <form action={mudarStatusReserva.bind(null, r.id, "compareceu", data)}><button className="underline">compareceu</button></form>
                          <form action={mudarStatusReserva.bind(null, r.id, "no_show", data)}><button className="underline">no-show</button></form>
                          <form action={mudarStatusReserva.bind(null, r.id, "cancelada", data)}><button className="underline">cancelar</button></form>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Tabela>
          </div>
        </Secao>
        <Secao titulo="Atendimentos" descricao="attach = mesas com a categoria / mesas atendidas · giro por mesa = atendimentos / mesas">
          <Formulario acao={salvarAtendimento} rotuloBotao="Lançar atendimento" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input type="hidden" name="data" value={data} />
            <Campo rotulo="Mesa"><input name="mesa" className="campo py-1" required /></Campo>
            <Campo rotulo="Clientes"><input name="clientes" className="campo num py-1" inputMode="numeric" required /></Campo>
            <Campo rotulo="Chegada"><input type="time" name="chegada" className="campo py-1" /></Campo>
            <Campo rotulo="Saída"><input type="time" name="saida" className="campo py-1" /></Campo>
            <Campo rotulo="Garçom">
              <select name="garcom_id" className="campo py-1">
                <option value="">—</option>
                {garcons.map((g) => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Total (R$)"><input name="total" className="campo num py-1" inputMode="decimal" /></Campo>
            <div className="col-span-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" name="teve_entrada" /> entrada</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="teve_sobremesa" /> sobremesa</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="teve_bebida" /> bebida</label>
            </div>
          </Formulario>
          <div className="mt-4">
            <Tabela cabecalho={[{ rotulo: "Mesa" }, { rotulo: "Clientes", num: true }, { rotulo: "Chegada" }, { rotulo: "Saída" }, { rotulo: "Entrada" }, { rotulo: "Sobremesa" }, { rotulo: "Bebida" }, { rotulo: "Total", num: true }]} vazio={atendimentos.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem atendimentos lançados</div> : null}>
              {atendimentos.map((a) => (
                <tr key={a.id}>
                  <Td>{a.mesa ?? a.comanda ?? ""}</Td>
                  <Td num>{formatarInteiro(a.clientes)}</Td>
                  <Td>{formatarHora(a.chegada)}</Td>
                  <Td>{formatarHora(a.saida)}</Td>
                  <Td>{sim(a.teveEntrada)}</Td>
                  <Td>{sim(a.teveSobremesa)}</Td>
                  <Td>{sim(a.teveBebida)}</Td>
                  <Td num>{formatarMoeda(a.total)}</Td>
                </tr>
              ))}
            </Tabela>
          </div>
        </Secao>
      </div>
    </>
  );
}
