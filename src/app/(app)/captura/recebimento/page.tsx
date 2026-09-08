import { formatarDataIso, formatarInteiro, formatarMoeda, hojeIso } from "@/formato";
import { listarFornecedores, listarInsumos } from "@/lib/dados/cadastro";
import { comprasRecentes } from "@/lib/dados/captura";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarRecebimento } from "./acoes";

export const metadata = { title: "Recebimento" };

const LINHAS = 8;

export default async function PaginaRecebimento({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const [fornecedores, insumos, compras] = await Promise.all([listarFornecedores(), listarInsumos(), comprasRecentes()]);
  return (
    <>
      <Titulo sub="3 minutos por nota · cada item gera o preço vigente do insumo com origem nota">Recebimento</Titulo>
      <Formulario acao={salvarRecebimento} rotuloBotao="Lançar recebimento">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Data"><input type="date" name="data" defaultValue={data} className="campo" required /></Campo>
          <Campo rotulo="Fornecedor">
            <select name="fornecedor_id" className="campo">
              <option value="">sem fornecedor cadastrado</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}{f.homologado ? "" : " (não homologado)"}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Número da nota"><input name="nota_numero" className="campo" /></Campo>
        </div>
        <Secao titulo="Itens" descricao="Quantidade na unidade de uso do insumo (kg, L ou un). Linhas em branco são ignoradas.">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="num">Quantidade</th>
                  <th className="num">Preço unitário</th>
                  <th className="num">Temperatura (°C)</th>
                  <th>Validade</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: LINHAS }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <select name={`insumo:${i}`} className="campo py-1">
                        <option value="">—</option>
                        {insumos.map((ins) => (
                          <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidadeUso})</option>
                        ))}
                      </select>
                    </td>
                    <td className="num"><input name={`quantidade:${i}`} className="campo num w-24 py-1" inputMode="decimal" /></td>
                    <td className="num"><input name={`preco:${i}`} className="campo num w-28 py-1" inputMode="decimal" /></td>
                    <td className="num"><input name={`temperatura:${i}`} className="campo num w-20 py-1" inputMode="decimal" /></td>
                    <td><input type="date" name={`validade:${i}`} className="campo py-1" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </Formulario>
      <div className="mt-8" />
      <Secao titulo="Últimos recebimentos">
        <Tabela cabecalho={[{ rotulo: "Data" }, { rotulo: "Fornecedor" }, { rotulo: "Nota" }, { rotulo: "Itens", num: true }, { rotulo: "Total", num: true }]} vazio={compras.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhuma nota recebida</div> : null}>
          {compras.map((c) => (
            <tr key={c.id}>
              <Td>{formatarDataIso(c.data)}</Td>
              <Td>{c.fornecedor ?? "sem dado"}</Td>
              <Td>{c.nota ?? ""}</Td>
              <Td num>{formatarInteiro(c.itens)}</Td>
              <Td num>{formatarMoeda(c.total)}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
