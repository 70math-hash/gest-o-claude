import { Suspense } from "react";
import { formatarDataIso, formatarInteiro, formatarMoeda, hojeIso, nomeDiaSemana } from "@/formato";
import { conciliacaoDoDia, vendaDoDia } from "@/lib/dados/hoje";
import { listarInsumos, listarProdutosAtivos } from "@/lib/dados/cadastro";
import { perdasDoDia } from "@/lib/dados/captura";
import { Aviso, BotaoLink, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { Formulario } from "@/componentes/formulario";
import { adicionarPerda, removerPerda, salvarFechamento } from "./acoes";

export const metadata = { title: "Fechamento do dia" };

const MOTIVOS = [
  ["quebra", "quebra"],
  ["vencimento", "vencimento"],
  ["erro", "erro de produção"],
  ["cortesia", "cortesia"],
  ["degustacao", "degustação"],
  ["teste", "teste"],
];

export default async function PaginaFechamento({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const [venda, conciliacao, perdas, produtos, insumos] = await Promise.all([vendaDoDia(data), conciliacaoDoDia(data), perdasDoDia(data), listarProdutosAtivos(), listarInsumos()]);
  const v = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · 5 minutos`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Fechamento do dia
      </Titulo>
      <Aviso nivel="info">
        Tem o export do Altec? <BotaoLink href={`/importar?tipo=altec_dia&data=${data}`} secundario>Subir o export do dia</BotaoLink> preenche faturamento, segmentos e colaboradores. O que o arquivo não trouxer, lance aqui.
      </Aviso>
      <div className="mt-6" />
      <Formulario acao={salvarFechamento} rotuloBotao="Salvar fechamento">
        <input type="hidden" name="data" value={data} />
        <Secao titulo="Números do dia">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Faturamento bruto (sem taxa de serviço)"><input name="faturamento_bruto" className="campo num" inputMode="decimal" defaultValue={v(venda?.faturamento_bruto)} placeholder="0,00" /></Campo>
            <Campo rotulo="Taxa de serviço" ajuda="em branco calcula 13% do faturamento"><input name="taxa_servico" className="campo num" inputMode="decimal" defaultValue={v(venda?.taxa_servico)} placeholder="13%" /></Campo>
            <Campo rotulo="Clientes"><input name="clientes" className="campo num" inputMode="numeric" defaultValue={v(venda?.clientes)} /></Campo>
            <Campo rotulo="Comandas"><input name="comandas" className="campo num" inputMode="numeric" defaultValue={v(venda?.comandas)} /></Campo>
            <Campo rotulo="Pratos vendidos (cozinha)"><input name="pratos_vendidos" className="campo num" inputMode="numeric" defaultValue={v(venda?.pratos_vendidos)} /></Campo>
            <Campo rotulo="Cozinha (R$)"><input name="seg_cozinha" className="campo num" inputMode="decimal" defaultValue={v(venda?.por_segmento?.cozinha)} /></Campo>
            <Campo rotulo="Salão (R$)"><input name="seg_salao" className="campo num" inputMode="decimal" defaultValue={v(venda?.por_segmento?.salao)} /></Campo>
            <Campo rotulo="Bar (R$)"><input name="seg_bar" className="campo num" inputMode="decimal" defaultValue={v(venda?.por_segmento?.bar)} /></Campo>
            <Campo rotulo="Delivery (R$)"><input name="seg_delivery" className="campo num" inputMode="decimal" defaultValue={v(venda?.por_segmento?.delivery)} /></Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="teve_2x1" defaultChecked={venda?.teve_2x1 ?? false} /> Dia com 2x1 (o CMV do dia soma o custo das gratuitas e nunca desconta a receita)
            </label>
          </div>
        </Secao>
        <Secao titulo="Conciliação" descricao="Os quatro números. Divergência diferente de zero é alerta no mesmo dia.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Vendas do sistema"><input name="vendas_sistema" className="campo num" inputMode="decimal" defaultValue={v(conciliacao?.vendas_sistema)} /></Campo>
            <Campo rotulo="Recebido na adquirente"><input name="recebido_adquirente" className="campo num" inputMode="decimal" defaultValue={v(conciliacao?.recebido_adquirente)} /></Campo>
            <Campo rotulo="Recebido em marketplace"><input name="recebido_marketplace" className="campo num" inputMode="decimal" defaultValue={v(conciliacao?.recebido_marketplace)} /></Campo>
            <Campo rotulo="Recebido em pix e dinheiro"><input name="recebido_pix_dinheiro" className="campo num" inputMode="decimal" defaultValue={v(conciliacao?.recebido_pix_dinheiro)} /></Campo>
          </div>
          {conciliacao?.divergencia !== null && conciliacao?.divergencia !== undefined && (
            <div className={`mt-3 text-sm ${conciliacao.divergencia === 0 ? "text-cinza-escuro" : "font-medium"}`}>
              Divergência lançada: <span className="num">{formatarMoeda(conciliacao.divergencia)}</span>
              {conciliacao.divergencia !== 0 && " · alerta"}
            </div>
          )}
        </Secao>
        <Secao titulo="Ocorrência do serviço">
          <textarea name="ocorrencia" className="campo" rows={2} defaultValue={venda?.ocorrencia ?? ""} placeholder="uma linha: o que marcou o serviço" />
        </Secao>
      </Formulario>

      <div className="mt-10" />
      <Secao titulo="Perdas, cortesias, degustações e testes" descricao="Cortesia e teste entram aqui e explicam o gap de controle.">
        {perdas.length > 0 && (
          <div className="mb-4">
            <Tabela cabecalho={[{ rotulo: "Item" }, { rotulo: "Motivo" }, { rotulo: "Quantidade", num: true }, { rotulo: "Valor", num: true }, { rotulo: "" }]}>
              {perdas.map((p) => (
                <tr key={p.id}>
                  <Td>{p.item}</Td>
                  <Td>{p.motivo}</Td>
                  <Td num>{formatarInteiro(p.quantidade)}</Td>
                  <Td num>{formatarMoeda(p.valor)}</Td>
                  <Td>
                    <form action={removerPerda.bind(null, p.id, data)}>
                      <button className="text-xs underline">apagar</button>
                    </form>
                  </Td>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
        <Formulario acao={adicionarPerda} rotuloBotao="Adicionar" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="data" value={data} />
          <Campo rotulo="Produto ou insumo">
            <select name="item" className="campo" required>
              <option value="">escolha</option>
              <optgroup label="Produtos">
                {produtos.map((p) => (
                  <option key={p.id} value={`produto:${p.id}`}>{p.nome}</option>
                ))}
              </optgroup>
              <optgroup label="Insumos">
                {insumos.map((i) => (
                  <option key={i.id} value={`insumo:${i.id}`}>{i.nome}</option>
                ))}
              </optgroup>
            </select>
          </Campo>
          <Campo rotulo="Motivo">
            <select name="motivo" className="campo" required>
              {MOTIVOS.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Quantidade"><input name="quantidade" className="campo num" inputMode="decimal" required /></Campo>
          <Campo rotulo="Valor (R$)" ajuda="em branco usa o custo vigente"><input name="valor" className="campo num" inputMode="decimal" /></Campo>
        </Formulario>
      </Secao>
    </>
  );
}
