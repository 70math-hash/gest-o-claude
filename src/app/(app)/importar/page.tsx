import { formatarDataHora, formatarDataIso, formatarInteiro, hojeIso } from "@/formato";
import { importacoesRecentes, pendenciasAbertas } from "@/lib/dados/importacao";
import { listarProdutosAtivos } from "@/lib/dados/cadastro";
import { Aviso, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { importarArquivo, resolverPendencia, criarProdutoEResolver } from "./acoes";

export const metadata = { title: "Importar" };

const TIPOS = [
  ["altec_r3", "Altec · R3 Vendas por Produto Detalhado", "CMV por bloco, ranking, engenharia de cardápio, 2x1"],
  ["altec_dia", "Altec · Vendas do dia por segmento e colaborador", "faturamento com taxa, segmentos, pratos, receita por garçom e barman"],
  ["comanda", "Altec · Vendas por comanda ou mesa", "atendimentos: attach e giro por mesa"],
  ["santander", "Santander · Extrato CSV ou XLS", "despesas para classificar e créditos para a conciliação"],
  ["cadastro", "Cadastro inicial · insumos, produções e fichas", "planilha ou export do Altec, com relatório de inconsistência"],
] as const;

export default async function PaginaImportar({ searchParams }: { searchParams: Promise<{ tipo?: string; data?: string }> }) {
  const p = await searchParams;
  const tipo = TIPOS.some((t) => t[0] === p.tipo) ? (p.tipo as string) : "altec_r3";
  const data = p.data && /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? p.data : hojeIso();
  const [recentes, pendencias, produtos] = await Promise.all([importacoesRecentes(), pendenciasAbertas(), listarProdutosAtivos()]);
  return (
    <>
      <Titulo sub="Toda importação é idempotente pelo hash do arquivo: o mesmo arquivo não entra duas vezes">Importar</Titulo>
      <Formulario acao={importarArquivo} rotuloBotao="Importar" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Tipo de arquivo">
            <select name="tipo" className="campo" defaultValue={tipo}>
              {TIPOS.map((t) => (
                <option key={t[0]} value={t[0]}>{t[1]}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Arquivo (XLSX, XLS ou CSV)"><input type="file" name="arquivo" className="campo" accept=".xlsx,.xls,.csv,.txt" required /></Campo>
          <Campo rotulo="Data ou início do período" ajuda="usada quando o arquivo não traz a data; venda do dia e comanda usam esta data"><input type="date" name="data" className="campo" defaultValue={data} /></Campo>
          <Campo rotulo="Fim do período (R3)" ajuda="em branco: lido do cabeçalho do arquivo ou igual ao início"><input type="date" name="data_fim" className="campo" /></Campo>
        </div>
        <ul className="text-xs text-cinza-escuro">
          {TIPOS.map((t) => (
            <li key={t[0]}>
              <span className="text-preto">{t[1]}</span>: {t[2]}
            </li>
          ))}
        </ul>
      </Formulario>

      <div className="mt-8" />
      <Secao titulo={`Fila de mapeamento (${pendencias.length})`} descricao="item do arquivo sem mapeamento deixa a importação pendente até resolver; categoria desconhecida vai para classificação manual">
        {pendencias.length === 0 ? (
          <div className="text-sm text-cinza-escuro">fila vazia</div>
        ) : (
          <div className="space-y-3">
            {pendencias.map((pd) => (
              <div key={pd.id} className="border border-cinza-claro bg-branco p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-medium">{pd.nomeAltec ?? pd.categoriaAltec ?? "?"}</span>
                    {pd.idAltec && <span className="num text-cinza-escuro"> · ID {pd.idAltec}</span>}
                    <span className="text-cinza-escuro"> · {pd.tipo === "produto_sem_mapeamento" ? "produto sem mapeamento" : pd.tipo === "categoria_desconhecida" ? "categoria desconhecida" : "gratuita 2x1 a confirmar"} · {pd.categoriaAltec ?? ""} · {formatarInteiro(pd.qtde)} un</span>
                  </div>
                  <div className="text-xs text-cinza-escuro">{pd.arquivo} · {formatarDataHora(pd.criadoEm)}</div>
                </div>
                {pd.tipo === "produto_sem_mapeamento" && (
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    <Formulario acao={resolverPendencia} rotuloBotao="Mapear" className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="pendencia_id" value={pd.id} />
                      <Campo rotulo="Produto existente">
                        <select name="produto_id" className="campo py-1" required>
                          <option value="">escolha</option>
                          {produtos.map((pr) => (
                            <option key={pr.id} value={pr.id}>{pr.nome} ({pr.bloco})</option>
                          ))}
                        </select>
                      </Campo>
                    </Formulario>
                    <Formulario acao={criarProdutoEResolver} rotuloBotao="Criar e mapear" className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="pendencia_id" value={pd.id} />
                      <Campo rotulo="Novo produto"><input name="nome" className="campo py-1" defaultValue={pd.nomeAltec ?? ""} required /></Campo>
                      <Campo rotulo="Bloco">
                        <select name="bloco" className="campo py-1" defaultValue={pd.bloco ?? "pizza"}>
                          {["pizza", "entrada", "sobremesa", "bar", "salao"].map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </Campo>
                    </Formulario>
                  </div>
                )}
                {pd.tipo === "categoria_desconhecida" && (
                  <div className="mt-2 text-xs text-cinza-escuro">As linhas desta categoria entraram sem bloco. Mapeie cada produto acima ou cadastre a categoria no bloco certo criando os produtos.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Importações recentes">
        <Tabela cabecalho={[{ rotulo: "Quando" }, { rotulo: "Tipo" }, { rotulo: "Arquivo" }, { rotulo: "Período" }, { rotulo: "Linhas", num: true }, { rotulo: "Situação" }, { rotulo: "Avisos" }]} vazio={recentes.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">nenhuma importação ainda</div> : null}>
          {recentes.map((i) => (
            <tr key={i.id}>
              <Td>{formatarDataHora(i.criadoEm)}</Td>
              <Td>{i.tipo}</Td>
              <Td className="max-w-xs truncate">{i.arquivo}</Td>
              <Td>{i.inicio ? `${formatarDataIso(i.inicio)}${i.fim && i.fim !== i.inicio ? ` a ${formatarDataIso(i.fim)}` : ""}` : "—"}</Td>
              <Td num>{formatarInteiro(i.linhas)}</Td>
              <Td>{i.status}</Td>
              <Td className="text-xs text-cinza-escuro">{i.avisos.slice(0, 3).join(" · ")}{i.avisos.length > 3 ? ` (+${i.avisos.length - 3})` : ""}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
      <Aviso nivel="info">Os formatos foram implementados a partir da especificação, sem amostra real. Ao subir os primeiros arquivos, os avisos de cada importação mostram o que o leitor não reconheceu.</Aviso>
    </>
  );
}
