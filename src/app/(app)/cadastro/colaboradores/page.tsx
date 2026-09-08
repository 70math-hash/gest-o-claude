import { formatarDataIso, formatarMoeda, hojeIso, formatarCompetencia } from "@/formato";
import { listarColaboradores } from "@/lib/dados/cadastro";
import { bd, numero } from "@/lib/dados/base";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { desligarColaborador, salvarColaborador, salvarFolha } from "../acoes";

export const metadata = { title: "Colaboradores" };

export default async function PaginaColaboradores({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const competencia = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hojeIso().slice(0, 7);
  const colaboradores = await listarColaboradores(false);
  const { supabase, sessao } = await bd();
  const { data: folha } = await supabase.from("folha_mensal").select("colaborador_id, salario, encargos, beneficios, horas_extras_valor").eq("unidade_id", sessao.unidadeId).eq("competencia", `${competencia}-01`);
  const linhaFolha = (id: string) => (folha ?? []).find((f) => f.colaborador_id === id);
  const v = (x: unknown) => { const n = numero(x); return n === null ? "" : String(n).replace(".", ","); };
  const ativos = colaboradores.filter((c) => c.ativo);
  return (
    <>
      <Titulo sub={`${ativos.length} ativos · ${colaboradores.length - ativos.length} desligados`}>Colaboradores e folha</Titulo>
      <Secao titulo="Novo colaborador">
        <Formulario acao={salvarColaborador} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Cargo"><input name="cargo" className="campo" required placeholder="cozinheiro, garçom, barman..." /></Campo>
          <Campo rotulo="Praça"><input name="praca" className="campo" placeholder="cozinha, salao, bar" /></Campo>
          <Campo rotulo="Código no Altec" ajuda="para receita por garçom e barman"><input name="codigo_altec" className="campo" /></Campo>
          <Campo rotulo="Admissão"><input type="date" name="admissao" className="campo" required /></Campo>
          <Campo rotulo="Salário base"><input name="salario_base" className="campo num" inputMode="decimal" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Equipe">
        <Tabela cabecalho={[{ rotulo: "Nome" }, { rotulo: "Cargo" }, { rotulo: "Praça" }, { rotulo: "Código" }, { rotulo: "Admissão" }, { rotulo: "Desligamento" }, { rotulo: "Salário base", num: true }, { rotulo: "" }]} vazio={colaboradores.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhum colaborador cadastrado</div> : null}>
          {colaboradores.map((c) => (
            <tr key={c.id} className={c.ativo ? "" : "text-cinza"}>
              <Td>{c.nome}</Td>
              <Td>{c.cargo}</Td>
              <Td>{c.praca ?? ""}</Td>
              <Td className="num">{c.codigoAltec ?? ""}</Td>
              <Td>{formatarDataIso(c.admissao)}</Td>
              <Td>{c.desligamento ? formatarDataIso(c.desligamento) : "—"}</Td>
              <Td num>{formatarMoeda(c.salarioBase)}</Td>
              <Td>{c.ativo && <form action={desligarColaborador.bind(null, c.id, hojeIso())}><button className="text-xs underline">desligar hoje</button></form>}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
      <Secao titulo={`Folha de ${formatarCompetencia(`${competencia}-01`)}`} descricao="salário, encargos, benefícios e horas extras por colaborador · horas extras acima de 5% da folha é alerta">
        <form className="mb-3 flex items-center gap-2 text-sm">
          <input type="month" name="mes" defaultValue={competencia} className="campo w-auto py-1" />
          <button className="botao-secundario py-1">Trocar mês</button>
        </form>
        {ativos.length > 0 && (
          <Formulario acao={salvarFolha} rotuloBotao="Salvar folha">
            <input type="hidden" name="competencia" value={competencia} />
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Colaborador</th><th className="num">Salário</th><th className="num">Encargos</th><th className="num">Benefícios</th><th className="num">Horas extras (R$)</th></tr></thead>
                <tbody>
                  {ativos.map((c) => {
                    const f = linhaFolha(c.id);
                    return (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td className="num"><input name={`salario:${c.id}`} className="campo num w-28 py-1" inputMode="decimal" defaultValue={f ? v(f.salario) : v(c.salarioBase)} /></td>
                        <td className="num"><input name={`encargos:${c.id}`} className="campo num w-28 py-1" inputMode="decimal" defaultValue={f ? v(f.encargos) : ""} /></td>
                        <td className="num"><input name={`beneficios:${c.id}`} className="campo num w-28 py-1" inputMode="decimal" defaultValue={f ? v(f.beneficios) : ""} /></td>
                        <td className="num"><input name={`extras:${c.id}`} className="campo num w-28 py-1" inputMode="decimal" defaultValue={f ? v(f.horas_extras_valor) : ""} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Formulario>
        )}
      </Secao>
    </>
  );
}
