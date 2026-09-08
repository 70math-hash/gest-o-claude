import { Suspense } from "react";
import { formatarDataIso, formatarNumero, formatarPercentual, hojeIso, nomeDiaSemana, somarDias } from "@/formato";
import { listarProducoes } from "@/lib/dados/cadastro";
import { bateladasDoPeriodo } from "@/lib/dados/captura";
import { Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { Formulario } from "@/componentes/formulario";
import { salvarBatelada } from "./acoes";

export const metadata = { title: "Batelada" };

export default async function PaginaBatelada({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const [producoes, bateladas] = await Promise.all([listarProducoes(), bateladasDoPeriodo(somarDias(data, -13), data)]);
  const comRendimento = producoes.filter((p) => p.ativo && p.rendimentoDeclarado !== null);
  const pendentes = producoes.filter((p) => p.ativo && p.rendimentoDeclarado === null);
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · 30 segundos`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Batelada
      </Titulo>
      <Formulario acao={salvarBatelada} rotuloBotao="Lançar batelada" className="grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="data" value={data} />
        <Campo rotulo="Produção">
          <select name="producao_id" className="campo" required>
            <option value="">escolha</option>
            {comRendimento.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} · declarado {formatarNumero(p.rendimentoDeclarado, 3, 0)} {p.unidadeRendimento}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Rendimento real pesado" ajuda="na unidade de rendimento da produção (kg, L ou un)">
          <input name="rendimento_real" className="campo num" inputMode="decimal" required placeholder="2,150" />
        </Campo>
        <Campo rotulo="Observação"><input name="observacao" className="campo" /></Campo>
      </Formulario>
      {pendentes.length > 0 && (
        <div className="mt-4 text-sm text-cinza-escuro">
          Produções sem rendimento declarado não aceitam batelada até o cadastro: {pendentes.map((p) => p.nome).join(", ")}.
        </div>
      )}
      <div className="mt-8" />
      <Secao titulo="Últimas bateladas (14 dias)" descricao="desvio_rendimento = (real − declarado) / declarado · alerta acima de 3%">
        <Tabela cabecalho={[{ rotulo: "Data" }, { rotulo: "Produção" }, { rotulo: "Real", num: true }, { rotulo: "Declarado", num: true }, { rotulo: "Desvio", num: true }, { rotulo: "" }]} vazio={bateladas.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhuma batelada pesada no período</div> : null}>
          {bateladas.map((b) => (
            <tr key={b.id}>
              <Td>{formatarDataIso(b.data)}</Td>
              <Td>{b.producao}</Td>
              <Td num>{formatarNumero(b.real, 3, 0)}</Td>
              <Td num>{formatarNumero(b.declarado, 3, 0)}</Td>
              <Td num>{formatarPercentual(b.desvio)}</Td>
              <Td><Semaforo nivel={b.alerta ? "alerta" : "otimo"} /></Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
