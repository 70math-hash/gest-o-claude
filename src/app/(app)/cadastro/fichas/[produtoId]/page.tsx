import { notFound } from "next/navigation";
import { formatarDataIso, formatarMoeda, formatarPercentual, formatarPontos, formatarQuantidade, hojeIso } from "@/formato";
import { fichaDetalhe } from "@/lib/dados/cadastro_detalhe";
import { listarInsumos, listarProducoes } from "@/lib/dados/cadastro";
import { Aviso, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { novaVersaoFicha } from "../../acoes";

const LINHAS = 14;

export default async function PaginaFicha({ params }: { params: Promise<{ produtoId: string }> }) {
  const { produtoId } = await params;
  const [d, insumos, producoes] = await Promise.all([fichaDetalhe(produtoId, hojeIso()), listarInsumos(), listarProducoes()]);
  if (!d) notFound();
  const atual = d.versoes[0];
  const anterior = d.versoes[1];
  const cmv = (custo: number | null) => (custo !== null && d.preco ? custo / d.preco : null);
  const opcoes = (selecionado?: { tipo: string; nome: string }) => (
    <>
      <option value="">—</option>
      <optgroup label="Insumos">{insumos.map((i) => <option key={i.id} value={`insumo:${i.id}`} selected={selecionado?.tipo === "insumo" && selecionado.nome === i.nome}>{i.nome}</option>)}</optgroup>
      <optgroup label="Produções">{producoes.map((p) => <option key={p.id} value={`producao:${p.id}`} selected={selecionado?.tipo === "producao" && selecionado.nome === p.nome}>{p.nome}</option>)}</optgroup>
    </>
  );
  return (
    <>
      <Titulo sub={`${d.produto.bloco}${d.produto.secao ? ` · ${d.produto.secao}` : ""} · preço ${formatarMoeda(d.preco)} · ${d.versoes.length} versão(ões)`}>{d.produto.nome}</Titulo>
      {atual && anterior && atual.custo !== null && anterior.custo !== null && (
        <Aviso nivel="info">
          Diferença entre a versão {atual.versao} e a {anterior.versao}: custo {formatarMoeda(atual.custo - anterior.custo)} ({formatarPercentual(atual.custo / anterior.custo - 1)}) · CMV {formatarPontos((cmv(atual.custo) ?? 0) - (cmv(anterior.custo) ?? 0))}.
        </Aviso>
      )}
      {d.versoes.map((v) => (
        <Secao key={v.id} titulo={`Versão ${v.versao} · ${formatarDataIso(v.inicio)} ${v.fim ? `a ${formatarDataIso(v.fim)}` : "(vigente)"}`} descricao={`motivo: ${v.motivo}${v.fotoUrl ? " · foto do padrão cadastrada" : " · sem foto do padrão"}`}>
          <Tabela cabecalho={[{ rotulo: "Componente" }, { rotulo: "Quantidade", num: true }, { rotulo: "Preço ou custo", num: true }, { rotulo: "Rendimento", num: true }, { rotulo: "Custo real", num: true }, { rotulo: "Custo Altec", num: true }, { rotulo: "Distorção", num: true }]}>
            {v.itens.map((i) => (
              <tr key={i.itemId}>
                <Td>{i.nome}{i.tipo === "producao" && <span className="text-xs text-cinza-escuro"> (produção)</span>}{i.falta && <div className="text-xs">falta: {i.falta}</div>}</Td>
                <Td num>{formatarQuantidade(i.unidade === "g" || i.unidade === "ml" ? i.quantidade / 1000 : i.quantidade, i.unidade === "g" ? "kg" : i.unidade === "ml" ? "l" : i.unidade)}</Td>
                <Td num>{formatarMoeda(i.precoOuCusto)}</Td>
                <Td num>{formatarPercentual(i.rendimento, 0)}</Td>
                <Td num>{formatarMoeda(i.custo)}</Td>
                <Td num>{formatarMoeda(i.custoAltec)}</Td>
                <Td num>{formatarMoeda(i.distorcao)}</Td>
              </tr>
            ))}
            <tr className="font-semibold">
              <Td>Total</Td>
              <Td num>{""}</Td>
              <Td num>{""}</Td>
              <Td num>{""}</Td>
              <Td num>{formatarMoeda(v.custo)} {v.custo !== null && d.preco ? `(${formatarPercentual(cmv(v.custo))})` : ""}</Td>
              <Td num>{formatarMoeda(v.custoAltec)} {v.custoAltec !== null && d.preco ? `(${formatarPercentual(cmv(v.custoAltec))})` : ""}</Td>
              <Td num>{v.custo !== null && v.custoAltec !== null ? formatarMoeda(v.custo - v.custoAltec) : ""}</Td>
            </tr>
          </Tabela>
        </Secao>
      ))}
      {d.versoes.length === 0 && <Aviso nivel="info">Sem ficha cadastrada. O custo em uso é o de referência (abril de 2026), se existir.</Aviso>}
      <Secao titulo="Nova versão da ficha" descricao="Alteração gera versão nova com motivo obrigatório; a anterior fica encerrada no histórico.">
        <Formulario acao={novaVersaoFicha} rotuloBotao="Gravar nova versão">
          <input type="hidden" name="produto_id" value={produtoId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Motivo"><input name="motivo" className="campo" required placeholder="troca de gramagem, novo insumo, correção..." /></Campo>
            <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
            <Campo rotulo="Foto do padrão (URL)"><input name="foto_url" className="campo" defaultValue={atual?.fotoUrl ?? ""} /></Campo>
          </div>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Componente</th><th className="num">Quantidade</th><th>Unidade</th></tr></thead>
              <tbody>
                {Array.from({ length: LINHAS }).map((_, n) => {
                  const item = atual?.itens[n];
                  return (
                    <tr key={n}>
                      <td><select name={`componente:${n}`} className="campo py-1" defaultValue={item ? `${item.tipo}:${[...insumos, ...producoes].find((x) => x.nome === item.nome)?.id ?? ""}` : ""}>{opcoes()}</select></td>
                      <td className="num"><input name={`quantidade:${n}`} className="campo num w-24 py-1" inputMode="decimal" defaultValue={item ? String(item.quantidade).replace(".", ",") : ""} /></td>
                      <td><select name={`unidade:${n}`} className="campo py-1" defaultValue={item?.unidade ?? "g"}><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option><option value="un">un</option></select></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmar_gramagem" /> confirmo as gramagens fora da faixa de 0,5 g a 1 kg (provável erro de vírgula)</label>
        </Formulario>
      </Secao>
    </>
  );
}
