import Link from "next/link";
import { formatarDataIso, formatarMoeda, hojeIso } from "@/formato";
import { listarSecoes, produtosComPreco } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarProduto } from "../acoes";

export const metadata = { title: "Produtos" };

export default async function PaginaProdutos() {
  const [produtos, secoes] = await Promise.all([produtosComPreco(), listarSecoes()]);
  const faixa = (p: (typeof produtos)[number]) => (p.preco === null ? null : p.piso !== null && p.preco < p.piso ? "abaixo do piso" : p.teto !== null && p.preco > p.teto ? "acima do teto" : "dentro");
  return (
    <>
      <Titulo sub={`${produtos.length} produtos · preço fora do piso ou teto da seção gera alerta`}>Produtos</Titulo>
      <Secao titulo="Novo produto">
        <Formulario acao={salvarProduto} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Bloco"><select name="bloco" className="campo">{["pizza", "entrada", "sobremesa", "bar", "salao"].map((b) => <option key={b} value={b}>{b}</option>)}</select></Campo>
          <Campo rotulo="Seção"><select name="secao_id" className="campo"><option value="">—</option>{secoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
          <Campo rotulo="Preço"><input name="preco" className="campo num" inputMode="decimal" /></Campo>
          <Campo rotulo="ID no Altec"><input name="id_altec" className="campo" /></Campo>
          <Campo rotulo="Nome no Altec"><input name="nome_altec" className="campo" /></Campo>
          <Campo rotulo="Vigência do preço"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sazonal" /> sazonal</label>
        </Formulario>
      </Secao>
      <Secao titulo="Produtos">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Produto" }, { rotulo: "Bloco" }, { rotulo: "Seção" }, { rotulo: "ID Altec" }, { rotulo: "Preço", num: true }, { rotulo: "Desde" }, { rotulo: "Faixa" }]}>
          {produtos.map((p) => {
            const f = faixa(p);
            return (
              <tr key={p.id} className={p.ativo ? "" : "text-cinza"}>
                <Td><Semaforo nivel={p.preco === null ? "critico" : f === "dentro" ? "otimo" : "alerta"} /></Td>
                <Td><Link href={`/cadastro/produtos/${p.id}`} className="underline">{p.nome}</Link>{p.sazonal && " (sazonal)"}{!p.ativo && " (inativo)"}</Td>
                <Td>{p.bloco}</Td>
                <Td>{p.secao ?? ""}</Td>
                <Td className="num">{p.idAltec ?? "confirmar"}</Td>
                <Td num>{formatarMoeda(p.preco)}</Td>
                <Td>{formatarDataIso(p.desde)}</Td>
                <Td>{f ?? "sem preço"}{p.piso !== null || p.teto !== null ? ` (${formatarMoeda(p.piso)} a ${formatarMoeda(p.teto)})` : ""}</Td>
              </tr>
            );
          })}
        </Tabela>
      </Secao>
    </>
  );
}
