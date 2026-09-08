import { Suspense } from "react";
import { formatarCompetencia, formatarDataIso, formatarInteiro, formatarMoeda, formatarNumero, formatarPercentual, hojeIso, mesDeReferencia } from "@/formato";
import { caixaProjecao, cmvRealBase, dreVertical, gapControle, horasEquipe, ocorrenciasDoPeriodo, painelUnico, primeCost, turnover } from "@/lib/dados/leitura";
import { pontoEquilibrioDoMes } from "@/lib/dados/hoje";
import { Aviso, Grade, Indicador, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorMes } from "@/componentes/periodo";

export const metadata = { title: "Mês" };

export default async function PaginaMes({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: param } = await searchParams;
  const competencia = param && /^\d{4}-\d{2}$/.test(param) ? param : hojeIso().slice(0, 7);
  const { inicio, fim } = mesDeReferencia(`${competencia}-01`);
  const [dre, pe, pc, gaps, cozinha, bar, tv, he, painel, caixa, ocorrencias] = await Promise.all([
    dreVertical(inicio),
    pontoEquilibrioDoMes(inicio),
    primeCost(inicio),
    gapControle(inicio, fim),
    cmvRealBase(inicio, fim, "cozinha"),
    cmvRealBase(inicio, fim, "bar"),
    turnover(inicio, fim),
    horasEquipe(inicio, fim),
    painelUnico(inicio, fim),
    caixaProjecao(inicio),
    ocorrenciasDoPeriodo(inicio, fim),
  ]);
  const indicador = (codigo: string) => painel.find((p) => p.codigo === codigo);
  const receita = dre.find((l) => l.codigo === "receita_bruta")?.valor ?? null;
  const linhaResultado = dre.find((l) => l.codigo === "resultado_operacional");
  const faltas = dre.filter((l) => l.falta).map((l) => `${l.linha}: ${l.falta}`);
  const totais = ["receita_bruta", "receita_liquida", "margem_contribuicao", "custos_fixos", "resultado_operacional", "resultado_final"];

  return (
    <>
      <Titulo sub={`Fechamento mensal · ${formatarCompetencia(inicio)} · fechar até o dia 10`} acoes={<Suspense><SeletorMes competencia={competencia} /></Suspense>}>
        Mês
      </Titulo>

      {faltas.length > 0 && <Aviso nivel="info">Para fechar o DRE ainda falta: {faltas.join(" · ")}.</Aviso>}

      <Secao titulo="DRE gerencial vertical" descricao="toda linha como fração da receita bruta · desvio contra orçamento (Cadastro › Orçamento)">
        <Tabela cabecalho={[{ rotulo: "Linha" }, { rotulo: "Valor", num: true }, { rotulo: "% receita", num: true }, { rotulo: "Orçamento", num: true }, { rotulo: "Desvio", num: true }, { rotulo: "Origem" }]}>
          {dre.map((l) => (
            <tr key={l.codigo} className={totais.includes(l.codigo) ? "font-semibold" : ""}>
              <Td>{l.linha}</Td>
              <Td num>{formatarMoeda(l.valor)}</Td>
              <Td num>{formatarPercentual(l.vertical)}</Td>
              <Td num>{l.orcamento === null ? "—" : formatarMoeda(l.orcamento)}</Td>
              <Td num>{l.desvio === null ? "—" : formatarMoeda(l.desvio)}</Td>
              <Td className="text-xs text-cinza-escuro">{l.falta ? `falta: ${l.falta}` : (l.origem ?? "")}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao titulo="CMV real por base e gap de controle" descricao="cmv_real = estoque_inicial + compras − estoque_final · gap = real − teórico, mesma base">
        <Grade colunas={2}>
          {[cozinha, bar].map((b) =>
            b ? (
              <div key={b.base} className="border border-cinza-claro bg-branco p-3 text-sm">
                <div className="text-xs uppercase tracking-wider text-cinza-escuro">{b.base}</div>
                {b.cmvPct === null ? (
                  <div className="mt-2 text-cinza-escuro">sem dado. Falta: {b.faltas.join("; ")}</div>
                ) : (
                  <>
                    <div className="num mt-1 text-xl">{formatarPercentual(b.cmvPct)}</div>
                    <div className="num mt-1 text-xs text-cinza-escuro">
                      {formatarDataIso(b.dataInicial)} a {formatarDataIso(b.dataFinal)} · estoque inicial {formatarMoeda(b.estoqueInicial)} + compras {formatarMoeda(b.compras)} − estoque final {formatarMoeda(b.estoqueFinal)} = {formatarMoeda(b.cmvReais)} sobre receita {formatarMoeda(b.receita)} ({b.origemReceita})
                    </div>
                  </>
                )}
              </div>
            ) : null,
          )}
        </Grade>
        <div className="mt-3">
          <Grade colunas={2}>
            {gaps.map((g) => (
              <Indicador key={g.base} codigo="gap_controle" nome={`Gap de controle · ${g.base}`} valor={g.gap} tipo="pp" meta={0.02} semaforo={g.gap === null ? null : g.gap <= 0.02 ? "otimo" : g.gap <= 0.04 ? "alerta" : "critico"} falta={g.faltas.join("; ") || null} detalhe={g.gapReais !== null ? `${formatarMoeda(g.gapReais)} · perdas registradas ${formatarMoeda(g.perdas)} · cortesias ${formatarMoeda(g.cortesias)} · não explicado ${formatarMoeda(g.naoExplicado)}${(g.naoExplicado ?? 0) > 0 ? " (porcionamento, perda não registrada, cortesia não lançada, erro de contagem)" : ""}` : undefined} />
            ))}
          </Grade>
        </div>
      </Secao>

      <Secao titulo="Resultado e ponto de equilíbrio">
        <Grade colunas={4}>
          <Indicador codigo="prime_cost_pct" nome="Prime cost" valor={pc?.pct ?? null} tipo="pct" falta={pc?.faltas.join("; ") || null} detalhe={pc?.pct !== null && pc?.pct !== undefined ? `CMV ${formatarMoeda(pc.cmv)} + folha ${formatarMoeda(pc.folha)}` : undefined} />
          <Indicador codigo="resultado_operacional" nome="Resultado operacional" valor={linhaResultado?.valor ?? null} tipo="reais" detalhe={linhaResultado?.vertical !== null && linhaResultado?.vertical !== undefined ? `${formatarPercentual(linhaResultado.vertical)} da receita` : undefined} falta={faltas.length > 0 ? "linhas do DRE acima" : null} />
          <Indicador codigo="ponto_equilibrio_reais" nome="Ponto de equilíbrio" valor={pe?.ponto_equilibrio_reais ?? null} tipo="reais" falta={pe?.faltas.join("; ") || null} detalhe={pe?.ponto_equilibrio_clientes ? `${formatarNumero(pe.ponto_equilibrio_clientes, 1)} clientes · ${formatarNumero(pe.ponto_equilibrio_por_dia, 1)} por dia em ${formatarInteiro(pe.dias_abertos)} dias` : undefined} />
          <Indicador codigo="dia_de_virada" nome="Dia de virada" valor={pe?.dia_de_virada ? Number(pe.dia_de_virada.slice(8, 10)) : null} tipo="dia" falta={pe?.ponto_equilibrio_reais ? "receita acumulada ainda não alcançou o ponto de equilíbrio" : "ponto de equilíbrio"} />
          <Indicador codigo="margem_seguranca" nome="Margem de segurança" valor={pe?.margem_seguranca ?? null} tipo="pct" semaforo={pe?.margem_seguranca === null || pe?.margem_seguranca === undefined ? null : pe.margem_seguranca >= 0.15 ? "otimo" : pe.margem_seguranca >= 0.05 ? "atencao" : pe.margem_seguranca >= 0 ? "alerta" : "critico"} falta={pe?.faltas.join("; ") || null} />
          <Indicador codigo="mc_pct" nome="Margem de contribuição" valor={pe?.mc_pct ?? null} tipo="pct" falta={pe?.faltas.join("; ") || null} />
          <Indicador codigo="ticket_medio" nome="Ticket médio do mês" valor={pe?.ticket_medio ?? null} tipo="reais" falta="clientes no fechamento do dia" />
          <Indicador nome="Receita bruta" valor={receita} tipo="reais" falta="fechamento do dia" />
        </Grade>
      </Secao>

      <Secao titulo="Gente" descricao="turnover DIEESE em uso (padrão); interno como alternativo; nunca comparar direto com o número do setor">
        <Grade colunas={4}>
          <Indicador codigo="folha_pct" nome="Folha sobre a receita" valor={indicador("folha_pct")?.valor ?? null} tipo="pct" falta={indicador("folha_pct")?.falta} />
          <Indicador codigo="horas_extras_pct" nome="Horas extras" valor={indicador("horas_extras_pct")?.valor ?? null} tipo="pct" meta={0.05} semaforo={indicador("horas_extras_pct")?.semaforo} falta={indicador("horas_extras_pct")?.falta} />
          <Indicador codigo="absenteismo" nome="Absenteísmo" valor={he?.absenteismo ?? null} tipo="pct" falta="escala com realizado" detalhe={he ? `${he.faltas} faltas em ${he.diasEscalados} dias escalados` : undefined} />
          <Indicador codigo="receita_por_hora" nome="Receita por hora trabalhada" valor={indicador("receita_por_hora")?.valor ?? null} tipo="reais" falta={indicador("receita_por_hora")?.falta} />
          <Indicador codigo="pratos_por_cozinheiro" nome="Pratos por cozinheiro" valor={indicador("pratos_por_cozinheiro")?.valor ?? null} tipo="numero" falta={indicador("pratos_por_cozinheiro")?.falta} detalhe={indicador("pratos_por_cozinheiro")?.detalhe} />
          <Indicador codigo="receita_por_garcom" nome="Receita por garçom" valor={indicador("receita_por_garcom")?.valor ?? null} tipo="reais" falta={indicador("receita_por_garcom")?.falta} />
          <Indicador codigo="turnover_dieese" nome="Turnover (DIEESE)" valor={tv?.dieese ?? null} tipo="pct" falta="colaboradores cadastrados" detalhe={tv ? `${tv.admissoes} admissões · ${tv.desligamentos} desligamentos · efetivo médio ${formatarNumero(tv.efetivoMedio, 1)}` : undefined} />
          <Indicador codigo="turnover_interno" nome="Turnover (interno)" valor={tv?.interno ?? null} tipo="pct" falta="colaboradores cadastrados" detalhe={tv?.tempoMedioCasa ? `tempo médio de casa ${formatarNumero(tv.tempoMedioCasa, 1)} meses` : undefined} />
        </Grade>
      </Secao>

      <Secao titulo="Caixa 13 semanas" descricao="projeção rolante · Cadastro › Caixa">
        <Tabela cabecalho={[{ rotulo: "Semana" }, { rotulo: "Entradas", num: true }, { rotulo: "Saídas", num: true }, { rotulo: "Saldo projetado", num: true }, { rotulo: "Observação" }]} vazio={caixa.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: projeção de caixa não lançada</div> : null}>
          {caixa.map((c) => (
            <tr key={c.id}>
              <Td>{formatarDataIso(c.semana)}</Td>
              <Td num>{formatarMoeda(c.entradas)}</Td>
              <Td num>{formatarMoeda(c.saidas)}</Td>
              <Td num>{formatarMoeda(c.saldoProjetado)}</Td>
              <Td>{c.observacao ?? ""}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao titulo="Feedback do mês" descricao="ocorrências do serviço lançadas no fechamento do dia">
        {ocorrencias.length === 0 ? (
          <div className="text-sm text-cinza-escuro">sem ocorrências lançadas</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {ocorrencias.map((o) => (
              <li key={o.data} className="border-l-2 border-preto pl-3">
                <span className="num text-cinza-escuro">{formatarDataIso(o.data)}</span> {o.texto}
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </>
  );
}
