import { notFound } from "next/navigation";
import { formatarDataIso, formatarMoeda, formatarNumero, formatarQuantidade, hojeIso } from "@/formato";
import { producaoDetalhe } from "@/lib/dados/cadastro_detalhe";
import { listarInsumos, listarProducoes } from "@/lib/dados/cadastro";
import { Aviso, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario, BotaoAcao } from "@/componentes/formulario";
import { adicionarItemBatelada, atualizarProducao, novoCustoProducao, recalcularCustoProducao, removerItemBatelada } from "../../acoes";

export default async function PaginaProducao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, insumos, producoes] = await Promise.all([producaoDetalhe(id), listarInsumos(), listarProducoes()]);
  if (!d) notFound();
  const p = d.producao;
  const rendimento = p.rendimento_declarado === null ? null : Number(p.rendimento_declarado);
  const vigente = d.custos.find((c) => c.fim === null);
  return (
    <>
      <Titulo sub={`código ${String(p.codigo_altec ?? "—")} · rendimento ${rendimento === null ? "pendente" : `${formatarNumero(rendimento, 3, 0)} ${String(p.unidade_rendimento)}`} · custo vigente ${vigente ? `${formatarMoeda(vigente.custo)}/${String(p.unidade_rendimento)} (${vigente.origem})` : "sem dado"}`}>{String(p.nome)}</Titulo>
      {rendimento === null && <Aviso nivel="alerta">Batelada pendente: meça o rendimento e informe abaixo. Sem rendimento, itens da batelada e lançamento de batelada ficam bloqueados (seção 8).</Aviso>}
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <Secao titulo="Rendimento e dados">
          <Formulario acao={atualizarProducao} rotuloBotao="Salvar" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={id} />
            <Campo rotulo={`Rendimento declarado (${String(p.unidade_rendimento)})`}><input name="rendimento_declarado" className="campo num" inputMode="decimal" defaultValue={rendimento === null ? "" : String(rendimento).replace(".", ",")} /></Campo>
            <Campo rotulo="Rendimento de uso (%)"><input name="rendimento_uso" className="campo num" inputMode="decimal" defaultValue={String(Number(p.rendimento_uso_pct ?? 1) * 100)} /></Campo>
            <Campo rotulo="Código Altec"><input name="codigo_altec" className="campo" defaultValue={String(p.codigo_altec ?? "")} /></Campo>
            <Campo rotulo="Observação"><input name="observacao" className="campo" defaultValue={String(p.observacao ?? "")} /></Campo>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={Boolean(p.ativo)} /> ativa</label>
          </Formulario>
        </Secao>
        <Secao titulo="Custo por unidade com vigência" descricao="custo_producao_por_kg = soma(custo dos ingredientes da batelada) / rendimento">
          <Formulario acao={novoCustoProducao} rotuloBotao="Gravar custo" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="producao_id" value={id} />
            <Campo rotulo={`Custo por ${String(p.unidade_rendimento)}`}><input name="custo_por_unidade" className="campo num" inputMode="decimal" required /></Campo>
            <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
            <Campo rotulo="Origem"><select name="origem" className="campo"><option value="manual">manual</option><option value="altec">altec</option></select></Campo>
          </Formulario>
          {d.itens.length > 0 && rendimento !== null && (
            <div className="mt-3">
              <BotaoAcao acao={recalcularCustoProducao.bind(null, id)}>Recalcular custo pela batelada</BotaoAcao>
            </div>
          )}
        </Secao>
      </div>
      <Secao titulo="Itens da batelada" descricao="permite produção dentro de produção">
        <Formulario acao={adicionarItemBatelada} rotuloBotao="Adicionar" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="producao_id" value={id} />
          <Campo rotulo="Componente">
            <select name="componente" className="campo py-1" required>
              <option value="">escolha</option>
              <optgroup label="Insumos">{insumos.map((i) => <option key={i.id} value={`insumo:${i.id}`}>{i.nome}</option>)}</optgroup>
              <optgroup label="Produções">{producoes.filter((x) => x.id !== id).map((x) => <option key={x.id} value={`producao:${x.id}`}>{x.nome}</option>)}</optgroup>
            </select>
          </Campo>
          <Campo rotulo="Quantidade"><input name="quantidade" className="campo num w-24 py-1" inputMode="decimal" required /></Campo>
          <Campo rotulo="Unidade"><select name="unidade" className="campo py-1"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option><option value="un">un</option></select></Campo>
        </Formulario>
        <div className="mt-3">
          <Tabela cabecalho={[{ rotulo: "Componente" }, { rotulo: "Quantidade", num: true }, { rotulo: "" }]} vazio={d.itens.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">batelada sem itens cadastrados</div> : null}>
            {d.itens.map((i) => (
              <tr key={i.id}>
                <Td>{i.nome}</Td>
                <Td num>{formatarQuantidade(i.unidade === "g" ? i.quantidade / 1000 : i.unidade === "ml" ? i.quantidade / 1000 : i.quantidade, i.unidade === "g" ? "kg" : i.unidade === "ml" ? "l" : i.unidade)}</Td>
                <Td><form action={removerItemBatelada.bind(null, i.id, id)}><button className="text-xs underline">remover</button></form></Td>
              </tr>
            ))}
          </Tabela>
        </div>
      </Secao>
      <Secao titulo="Histórico de custo">
        <Tabela cabecalho={[{ rotulo: "Vigência" }, { rotulo: "Custo", num: true }, { rotulo: "Batelada", num: true }, { rotulo: "Custo Altec", num: true }, { rotulo: "Origem" }]}>
          {d.custos.map((c) => (
            <tr key={c.id} className={c.fim === null ? "font-semibold" : ""}>
              <Td>{formatarDataIso(c.inicio)} {c.fim ? `a ${formatarDataIso(c.fim)}` : "(vigente)"}</Td>
              <Td num>{formatarMoeda(c.custo)}</Td>
              <Td num>{c.batelada === null ? "—" : formatarMoeda(c.batelada)}</Td>
              <Td num>{c.altec === null ? "—" : formatarMoeda(c.altec)}</Td>
              <Td>{c.origem}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
