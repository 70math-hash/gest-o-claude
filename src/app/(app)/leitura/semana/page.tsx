import { Suspense } from "react";
import { formatarDataIso, formatarInteiro, formatarMoeda, formatarNumero, formatarPercentual, hojeIso, nomeDiaSemana, semanaOperacional, somarDias } from "@/formato";
import { aderenciaPorDia, attachPeriodo, cmvPonderadoBloco, engenharia, escalaContraCurva, gapParcialItensA, sobraPorItem } from "@/lib/dados/leitura";
import { bateladasDoPeriodo } from "@/lib/dados/captura";
import { listarProcessos } from "@/lib/dados/cadastro";
import { Grade, Indicador, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorPeriodo } from "@/componentes/periodo";

export const metadata = { title: "Semana" };

const NOMES_BLOCO: Record<string, string> = { pizza: "Pizzas", entrada: "Entradas", sobremesa: "Sobremesas", bar: "Bar", salao: "Salão" };

function semaforoCmv(valor: number | null, meta: number | null, teto: number | null): string | null {
  if (valor === null || meta === null) return null;
  if (valor <= meta) return "otimo";
  if (valor <= (teto ?? meta + 0.02)) return "atencao";
  if (valor <= (teto ?? meta + 0.02) + 0.05) return "alerta";
  return "critico";
}

export default async function PaginaSemana({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const referencia = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const { inicio, fim } = semanaOperacional(referencia);
  const proxima = semanaOperacional(somarDias(fim, 2));
  const [blocos, gapA, aderencia, bateladas, sobra, attach, escala, processos, rankingPizza, rankingEntrada, rankingSobremesa] = await Promise.all([
    cmvPonderadoBloco(inicio, fim),
    gapParcialItensA(inicio, fim),
    aderenciaPorDia(inicio, fim),
    bateladasDoPeriodo(inicio, fim),
    sobraPorItem(inicio, fim),
    attachPeriodo(inicio, fim),
    escalaContraCurva(proxima.inicio),
    listarProcessos(),
    engenharia(inicio, fim, "pizza", "miller"),
    engenharia(inicio, fim, "entrada", "miller"),
    engenharia(inicio, fim, "sobremesa", "miller"),
  ]);
  const totalEtapas = aderencia.reduce((s, d) => s + d.etapas, 0);
  const aderenciaSemana = totalEtapas > 0 ? aderencia.reduce((s, d) => s + d.conferidas, 0) / totalEtapas : null;
  const atrasadas = aderencia.flatMap((d) => d.atrasadas.map((e) => `${nomeDiaSemana(d.data)}: ${e}`));
  const desvioMedio = bateladas.length > 0 ? bateladas.reduce((s, b) => s + Math.abs(b.desvio ?? 0), 0) / bateladas.length : null;
  const sobraTotal = sobra.reduce((s, i) => s + (i.sobra ?? 0), 0);
  const produzidoTotal = sobra.reduce((s, i) => s + (i.produzido ?? 0), 0);
  const gapAReais = gapA.length > 0 ? gapA.reduce((s, i) => s + (i.diferencaReais ?? 0), 0) : null;
  const rankings = [
    ["Pizzas", rankingPizza],
    ["Entradas", rankingEntrada],
    ["Sobremesas", rankingSobremesa],
  ] as const;

  return (
    <>
      <Titulo sub="Reunião semanal · semana operacional de terça a domingo" acoes={<Suspense><SeletorPeriodo inicio={inicio} fim={fim} passoDias={7} /></Suspense>}>
        Semana
      </Titulo>

      <Secao titulo="CMV ponderado por bloco contra a meta" descricao="cmv_ponderado_bloco = soma(custo_ficha × qtde) / soma(total_liquido) · meta é teto, não alvo">
        <Grade colunas={3}>
          {blocos.filter((b) => ["pizza", "entrada", "sobremesa"].includes(b.bloco)).map((b) => (
            <Indicador key={b.bloco} codigo="cmv_ponderado_bloco" nome={NOMES_BLOCO[b.bloco] ?? b.bloco} valor={b.cmvOperacional} tipo="pct" meta={b.meta} semaforo={semaforoCmv(b.cmvOperacional, b.meta, b.teto)} falta={b.receitaLiquida === 0 ? "importação do R3 da semana" : b.itensSemCusto > 0 ? `${b.itensSemCusto} produto(s) sem custo` : null} detalhe={b.receitaLiquida > 0 ? `${formatarInteiro(b.qtde)} un · receita ${formatarMoeda(b.receitaLiquida)} · cardápio ${formatarPercentual(b.cmvTabela)}${b.linhasSemProduto > 0 ? ` · ${b.linhasSemProduto} linhas sem mapeamento` : ""}` : undefined} />
          ))}
        </Grade>
      </Secao>

      <Secao titulo="Gap parcial dos itens A" descricao="inventário rotativo semanal · consumo real por estoque contra consumo teórico pelas fichas · parcial">
        {gapA.length === 0 ? (
          <div className="text-sm text-cinza-escuro">sem dado: falta a contagem rotativa dos itens classe A em duas segundas consecutivas.</div>
        ) : (
          <>
            <div className="mb-3 max-w-xs">
              <Indicador nome="Diferença total (parcial)" valor={gapAReais} tipo="reais" detalhe="positivo = consumiu mais do que as fichas explicam" />
            </div>
            <Tabela cabecalho={[{ rotulo: "Insumo" }, { rotulo: "Período" }, { rotulo: "Real", num: true }, { rotulo: "Teórico", num: true }, { rotulo: "Diferença", num: true }, { rotulo: "R$", num: true }]}>
              {gapA.map((g) => (
                <tr key={g.insumo}>
                  <Td>{g.insumo}</Td>
                  <Td>{formatarDataIso(g.dataInicial)} a {formatarDataIso(g.dataFinal)}</Td>
                  <Td num>{formatarNumero(g.consumoReal, 3, 0)}</Td>
                  <Td num>{formatarNumero(g.consumoTeorico, 3, 0)}</Td>
                  <Td num>{formatarNumero(g.diferenca, 3, 0)}</Td>
                  <Td num>{formatarMoeda(g.diferencaReais)}</Td>
                </tr>
              ))}
            </Tabela>
          </>
        )}
      </Secao>

      <Secao titulo="Processo">
        <Grade colunas={3}>
          <Indicador codigo="aderencia_cronograma" nome="Aderência ao cronograma" valor={aderenciaSemana} tipo="pct" meta={0.95} semaforo={aderenciaSemana === null ? null : aderenciaSemana >= 0.95 ? "otimo" : aderenciaSemana >= 0.9 ? "atencao" : aderenciaSemana >= 0.8 ? "alerta" : "critico"} falta="conferido das etapas do cronograma" detalhe={atrasadas.length > 0 ? `atrasadas: ${atrasadas.slice(0, 4).join("; ")}${atrasadas.length > 4 ? "…" : ""}` : undefined} />
          <Indicador codigo="desvio_rendimento" nome="Desvio de rendimento (médio absoluto)" valor={desvioMedio} tipo="pct" meta={0.03} semaforo={desvioMedio === null ? null : desvioMedio <= 0.03 ? "otimo" : desvioMedio <= 0.05 ? "atencao" : "alerta"} falta="bateladas pesadas na semana" detalhe={`${bateladas.length} batelada(s) · ${bateladas.filter((b) => b.alerta).length} acima de 3%`} />
          <Indicador codigo="sobra_pct" nome="Sobra" valor={produzidoTotal > 0 ? sobraTotal / produzidoTotal : null} tipo="pct" meta={0.05} semaforo={produzidoTotal > 0 ? (sobraTotal / produzidoTotal <= 0.05 ? "otimo" : sobraTotal / produzidoTotal <= 0.08 ? "atencao" : "alerta") : null} falta="produzido e sobra na produção do dia" detalhe={sobra.filter((s) => s.alerta).length > 0 ? `três dias acima de 5%: ${sobra.filter((s) => s.alerta).map((s) => s.item).join(", ")}` : undefined} />
        </Grade>
        {sobra.length > 0 && (
          <div className="mt-4">
            <Tabela cabecalho={[{ rotulo: "Item" }, { rotulo: "Dias", num: true }, { rotulo: "Produzido", num: true }, { rotulo: "Sobra", num: true }, { rotulo: "Sobra %", num: true }, { rotulo: "Refugo %", num: true }, { rotulo: "" }]}>
              {sobra.map((s) => (
                <tr key={`${s.tipo}-${s.item}`}>
                  <Td>{s.item}</Td>
                  <Td num>{formatarInteiro(s.dias)}</Td>
                  <Td num>{formatarNumero(s.produzido, 1, 0)}</Td>
                  <Td num>{formatarNumero(s.sobra, 1, 0)}</Td>
                  <Td num>{formatarPercentual(s.sobraPct)}</Td>
                  <Td num>{formatarPercentual(s.refugoPct)}</Td>
                  <Td><Semaforo nivel={s.alerta ? "alerta" : s.sobraPct !== null && s.sobraPct > 0.05 ? "atencao" : "otimo"} /></Td>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
      </Secao>

      <Secao titulo="Ranking de pratos" descricao="pela matriz de Miller sobre as vendas da semana">
        <div className="grid gap-4 lg:grid-cols-3">
          {rankings.map(([nome, itens]) => (
            <div key={nome}>
              <div className="mb-1 text-xs uppercase tracking-wider text-cinza-escuro">{nome}</div>
              {itens.length === 0 ? (
                <div className="text-sm text-cinza-escuro">sem dado: importação do R3</div>
              ) : (
                <Tabela cabecalho={[{ rotulo: "Item" }, { rotulo: "Un", num: true }, { rotulo: "CMV", num: true }, { rotulo: "Quadrante" }]}>
                  {itens.slice(0, 10).map((i) => (
                    <tr key={i.produtoId}>
                      <Td>{i.nome}</Td>
                      <Td num>{formatarInteiro(i.qtde)}</Td>
                      <Td num>{formatarPercentual(i.cmv)}</Td>
                      <Td>{i.quadrante?.replace(/_/g, " ") ?? (i.falta ?? "sem dado")}</Td>
                    </tr>
                  ))}
                </Tabela>
              )}
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Attach" descricao="mesas com a categoria / mesas atendidas">
        <Grade colunas={4}>
          <Indicador codigo="attach_entrada" nome="Entrada" valor={attach?.entrada ?? null} tipo="pct" falta="atendimentos com itens por mesa" />
          <Indicador codigo="attach_sobremesa" nome="Sobremesa" valor={attach?.sobremesa ?? null} tipo="pct" falta="atendimentos com itens por mesa" />
          <Indicador codigo="attach_bebida" nome="Bebida" valor={attach?.bebida ?? null} tipo="pct" falta="atendimentos com itens por mesa" />
          <Indicador codigo="tempo_a_mesa" nome="Tempo à mesa" valor={attach?.tempoMedio ?? null} tipo="min" falta="chegada e saída por atendimento" detalhe={attach ? `${attach.mesas} mesas` : undefined} />
        </Grade>
      </Secao>

      <Secao titulo="Escala da semana seguinte contra a curva" descricao={`${formatarDataIso(proxima.inicio)} a ${formatarDataIso(proxima.fim)} · média de clientes do mesmo dia nas últimas 8 semanas`}>
        <Tabela cabecalho={[{ rotulo: "Dia" }, { rotulo: "Escalados", num: true }, { rotulo: "Média de clientes", num: true }, { rotulo: "Média de receita", num: true }, { rotulo: "Clientes por escalado", num: true }]}>
          {escala.map((d) => (
            <tr key={d.data}>
              <Td>{nomeDiaSemana(d.data)} {formatarDataIso(d.data)}</Td>
              <Td num>{d.escalados > 0 ? formatarInteiro(d.escalados) : "sem dado"}</Td>
              <Td num>{formatarNumero(d.mediaClientes, 0)}</Td>
              <Td num>{formatarMoeda(d.mediaReceita)}</Td>
              <Td num>{d.escalados > 0 && d.mediaClientes !== null ? formatarNumero(d.mediaClientes / d.escalados, 1) : "sem dado"}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao titulo="POP auditado" descricao="cobertura_pop = processos com POP testado / processos críticos">
        <Tabela cabecalho={[{ rotulo: "Processo" }, { rotulo: "Praça" }, { rotulo: "POP" }, { rotulo: "Testado em" }]} vazio={processos.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: processos críticos</div> : null}>
          {processos.map((p) => (
            <tr key={p.id}>
              <Td>{p.nome}</Td>
              <Td>{p.praca ?? "—"}</Td>
              <Td>{p.popUrl ? `versão ${p.popVersao ?? "?"}` : "sem POP em arquivo"}</Td>
              <Td>{p.popTestadoEm ? formatarDataIso(p.popTestadoEm) : "não testado"}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
