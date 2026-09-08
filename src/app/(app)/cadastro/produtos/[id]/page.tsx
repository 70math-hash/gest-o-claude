import Link from "next/link";
import { notFound } from "next/navigation";
import { formatarDataIso, formatarMoeda, hojeIso } from "@/formato";
import { produtoDetalhe } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { atualizarProduto, novoPrecoProduto } from "../../acoes";

export default async function PaginaProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await produtoDetalhe(id);
  if (!d) notFound();
  const p = d.produto;
  const vigente = d.precos.find((x) => x.fim === null);
  return (
    <>
      <Titulo sub={`${String(p.bloco)} · preço vigente ${formatarMoeda(vigente?.preco ?? null)}`} acoes={<Link href={`/cadastro/fichas/${id}`} className="botao-secundario">Ficha técnica</Link>}>{String(p.nome)}</Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Novo preço com vigência">
          <Formulario acao={novoPrecoProduto} rotuloBotao="Gravar preço" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="produto_id" value={id} />
            <Campo rotulo="Preço"><input name="preco" className="campo num" inputMode="decimal" required defaultValue={vigente ? String(vigente.preco).replace(".", ",") : ""} /></Campo>
            <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
          </Formulario>
        </Secao>
        <Secao titulo="Dados do produto">
          <Formulario acao={atualizarProduto} rotuloBotao="Salvar" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={id} />
            <Campo rotulo="Nome"><input name="nome" className="campo" defaultValue={String(p.nome)} /></Campo>
            <Campo rotulo="Seção"><select name="secao_id" className="campo" defaultValue={String(p.secao_id ?? "")}><option value="">—</option>{d.secoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
            <Campo rotulo="ID no Altec"><input name="id_altec" className="campo" defaultValue={String(p.id_altec ?? "")} /></Campo>
            <Campo rotulo="Nome no Altec"><input name="nome_altec" className="campo" defaultValue={String(p.nome_altec ?? "")} /></Campo>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={Boolean(p.ativo)} /> ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sazonal" defaultChecked={Boolean(p.sazonal)} /> sazonal</label>
          </Formulario>
        </Secao>
      </div>
      <Secao titulo="Histórico de preço">
        <Tabela cabecalho={[{ rotulo: "Vigência" }, { rotulo: "Preço", num: true }]}>
          {d.precos.map((x) => (
            <tr key={x.id} className={x.fim === null ? "font-semibold" : ""}>
              <Td>{formatarDataIso(x.inicio)} {x.fim ? `a ${formatarDataIso(x.fim)}` : "(vigente)"}</Td>
              <Td num>{formatarMoeda(x.preco)}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
