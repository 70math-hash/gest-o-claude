import { notFound } from "next/navigation";
import { formatarDataIso, formatarMoeda, formatarPercentual, hojeIso } from "@/formato";
import { insumoDetalhe } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { atualizarInsumo, novoPrecoInsumo, vincularFornecedor } from "../../acoes";

export default async function PaginaInsumo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await insumoDetalhe(id);
  if (!d) notFound();
  const i = d.insumo;
  const vigente = d.precos.find((p) => p.fim === null);
  return (
    <>
      <Titulo sub={`${String(i.categoria ?? "")} · base ${String(i.base)} · unidade de uso ${String(i.unidade_uso)}`}>{String(i.nome)}</Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Nova vigência de preço e rendimento" descricao="A vigência anterior é fechada na data de início da nova. Nada é sobrescrito.">
          <Formulario acao={novoPrecoInsumo} rotuloBotao="Gravar vigência" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="insumo_id" value={id} />
            <Campo rotulo={`Preço por ${String(i.unidade_uso)}`}><input name="preco" className="campo num" inputMode="decimal" required defaultValue={vigente ? String(vigente.preco).replace(".", ",") : ""} /></Campo>
            <Campo rotulo="Rendimento (%)"><input name="rendimento" className="campo num" inputMode="decimal" required defaultValue={vigente?.rendimento ? String(vigente.rendimento * 100) : ""} /></Campo>
            <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
            <Campo rotulo="Origem">
              <select name="origem" className="campo"><option value="cotacao">cotação</option><option value="nota">nota</option><option value="manual">manual</option></select>
            </Campo>
          </Formulario>
        </Secao>
        <Secao titulo="Dados do insumo">
          <Formulario acao={atualizarInsumo} rotuloBotao="Salvar" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={id} />
            <Campo rotulo="Categoria"><input name="categoria" className="campo" defaultValue={String(i.categoria ?? "")} /></Campo>
            <Campo rotulo="Base"><select name="base" className="campo" defaultValue={String(i.base)}><option value="cozinha">cozinha</option><option value="bar">bar</option></select></Campo>
            <Campo rotulo="Curva ABC"><select name="curva_abc" className="campo" defaultValue={String(i.curva_abc ?? "")}><option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></Campo>
            <Campo rotulo="Código no Altec"><input name="codigo_altec" className="campo" defaultValue={String(i.codigo_altec ?? "")} /></Campo>
            <Campo rotulo="Fator compra → uso" ajuda="caixa com 12 un = 12"><input name="fator_compra_para_uso" className="campo num" inputMode="decimal" defaultValue={String(i.fator_compra_para_uso ?? 1).replace(".", ",")} /></Campo>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={Boolean(i.ativo)} /> ativo</label>
          </Formulario>
        </Secao>
      </div>
      <Secao titulo="Histórico de preço e rendimento">
        <Tabela cabecalho={[{ rotulo: "Vigência" }, { rotulo: "Preço", num: true }, { rotulo: "Rendimento", num: true }, { rotulo: "Custo efetivo", num: true }, { rotulo: "Origem" }]}>
          {d.precos.map((p) => (
            <tr key={p.id} className={p.fim === null ? "font-semibold" : ""}>
              <Td>{formatarDataIso(p.inicio)} {p.fim ? `a ${formatarDataIso(p.fim)}` : "(vigente)"}</Td>
              <Td num>{formatarMoeda(p.preco)}</Td>
              <Td num>{formatarPercentual(p.rendimento, 0)}</Td>
              <Td num>{p.preco !== null && p.rendimento ? formatarMoeda(p.preco / p.rendimento) : ""}</Td>
              <Td>{p.origem}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
      <Secao titulo="Fornecedores" descricao="Item classe A exige 2 homologados.">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {d.fornecedores.map((f) => (
            <li key={f.id} className="flex items-center justify-between border border-cinza-claro bg-branco p-2 text-sm">
              <span>{f.nome}{f.homologado ? "" : " (não homologado)"}</span>
              <form action={vincularFornecedor.bind(null, id, f.id, !f.vinculado)}>
                <button className="text-xs underline">{f.vinculado ? "desvincular" : "vincular"}</button>
              </form>
            </li>
          ))}
          {d.fornecedores.length === 0 && <li className="text-sm text-cinza-escuro">nenhum fornecedor cadastrado</li>}
        </ul>
      </Secao>
    </>
  );
}
