import { Suspense } from "react";
import { formatarDataIso, formatarHora, hojeIso, nomeDiaSemana, semanaOperacional, somarDias } from "@/formato";
import { escalasDaSemana } from "@/lib/dados/cadastro_detalhe";
import { listarColaboradores } from "@/lib/dados/cadastro";
import { Campo, Secao, Titulo } from "@/componentes/ui";
import { SeletorPeriodo } from "@/componentes/periodo";
import { Formulario } from "@/componentes/formulario";
import { salvarEscala, salvarRealizado } from "../acoes";

export const metadata = { title: "Escalas" };

export default async function PaginaEscalas({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const referencia = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const { inicio, fim } = semanaOperacional(referencia);
  const [escalas, colaboradores] = await Promise.all([escalasDaSemana(inicio, fim), listarColaboradores()]);
  const dias = Array.from({ length: 6 }, (_, i) => somarDias(inicio, i));
  const hora = (iso: string | null) => (iso ? formatarHora(iso) : "");
  return (
    <>
      <Titulo sub="semana operacional de terça a domingo · escala da semana seguinte é lançada na segunda" acoes={<Suspense><SeletorPeriodo inicio={inicio} fim={fim} passoDias={7} /></Suspense>}>Escalas</Titulo>
      <Secao titulo="Nova escala">
        <Formulario acao={salvarEscala} rotuloBotao="Salvar escala" className="grid gap-3 sm:grid-cols-4">
          <Campo rotulo="Colaborador"><select name="colaborador_id" className="campo" required><option value="">escolha</option>{colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.cargo})</option>)}</select></Campo>
          <Campo rotulo="Data"><input type="date" name="data" className="campo" defaultValue={inicio} required /></Campo>
          <Campo rotulo="Entrada"><input type="time" name="entrada" className="campo" defaultValue="16:00" required /></Campo>
          <Campo rotulo="Saída"><input type="time" name="saida" className="campo" defaultValue="00:00" required /></Campo>
        </Formulario>
        {colaboradores.length === 0 && <div className="mt-2 text-sm text-cinza-escuro">Cadastre colaboradores antes de montar a escala.</div>}
      </Secao>
      {dias.map((dia) => {
        const doDia = escalas.filter((e) => e.data === dia);
        return (
          <Secao key={dia} titulo={`${nomeDiaSemana(dia)} ${formatarDataIso(dia)}`} descricao={`${doDia.length} escalado(s)`}>
            {doDia.length === 0 ? (
              <div className="text-sm text-cinza-escuro">ninguém escalado</div>
            ) : (
              <div className="space-y-2">
                {doDia.map((e) => (
                  <Formulario key={e.id} acao={salvarRealizado} rotuloBotao="Salvar realizado" className="flex flex-wrap items-end gap-2 border border-cinza-claro bg-branco p-2 text-sm">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="data" value={e.data} />
                    <div className="min-w-40">
                      <div className="font-medium">{e.nome}</div>
                      <div className="num text-xs text-cinza-escuro">{e.cargo} · previsto {hora(e.entrada)} a {hora(e.saida)}</div>
                    </div>
                    <Campo rotulo="Realizado entrada"><input type="time" name="realizado_entrada" className="campo py-1" defaultValue={hora(e.realizadoEntrada)} /></Campo>
                    <Campo rotulo="Realizado saída"><input type="time" name="realizado_saida" className="campo py-1" defaultValue={hora(e.realizadoSaida)} /></Campo>
                    <label className="flex items-center gap-1"><input type="checkbox" name="falta" defaultChecked={e.falta} /> falta não programada</label>
                  </Formulario>
                ))}
              </div>
            )}
          </Secao>
        );
      })}
    </>
  );
}
