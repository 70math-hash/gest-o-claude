import Link from "next/link";
import { Suspense } from "react";
import { formatarDataIso, formatarInteiro, formatarMoeda, formatarPercentual, hojeIso, nomeDiaSemana, somarDias } from "@/formato";
import { sessaoAtual, podeGerir } from "@/lib/sessao";
import { cmvDia2x1, colaboradoresDoDia, conciliacaoDoDia, escaladosDoDia, indisponiveisDoDia, parametrosDaCasa, pontoDePadraoDoDia, pontoEquilibrioDoMes, reservasDoDia, vendaDoDia } from "@/lib/dados/hoje";
import { Aviso, BotaoLink, Grade, Indicador, Secao, SemDado, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { FormularioIndisponivel, BotaoRemoverIndisponivel } from "./indisponiveis";
import { listarProdutosAtivos } from "@/lib/dados/cadastro";

export const metadata = { title: "Hoje" };

export default async function PaginaHoje({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const semanaAnterior = somarDias(data, -7);
  const sessao = await sessaoAtual();
  const [venda, vendaAnterior, conciliacao, colaboradores, reservas, indisponiveis, padrao, pe, parametros, escalados, dois, produtos] = await Promise.all([
    vendaDoDia(data),
    vendaDoDia(semanaAnterior),
    conciliacaoDoDia(data),
    colaboradoresDoDia(data),
    reservasDoDia(data),
    indisponiveisDoDia(data),
    pontoDePadraoDoDia(data),
    pontoEquilibrioDoMes(data),
    parametrosDaCasa(),
    escaladosDoDia(data),
    cmvDia2x1(data),
    listarProdutosAtivos(),
  ]);

  const cozinheiros = Number(parametros?.cozinheiros_padrao ?? 0) || null;
  const faturamentoComTaxa = venda?.faturamento_bruto !== null && venda?.faturamento_bruto !== undefined ? venda.faturamento_bruto + (venda.taxa_servico ?? 0) : null;
  const ticket = venda?.faturamento_bruto && venda.clientes ? venda.faturamento_bruto / venda.clientes : null;
  const pratosPorCozinheiro = venda?.pratos_vendidos && cozinheiros ? venda.pratos_vendidos / cozinheiros : null;
  const garcons = colaboradores.filter((c) => c.segmento === "cozinha" || c.segmento === "salao");
  const barmans = colaboradores.filter((c) => c.segmento === "bar");
  const receitaPorGarcom = garcons.length > 0 ? garcons.reduce((s, c) => s + c.receita, 0) / garcons.length : null;
  const receitaPorBarman = barmans.length > 0 ? barmans.reduce((s, c) => s + c.receita, 0) / barmans.length : null;
  const variacao = venda?.faturamento_bruto && vendaAnterior?.faturamento_bruto ? venda.faturamento_bruto / vendaAnterior.faturamento_bruto - 1 : null;
  const mesasGrandes = reservas.filter((r) => r.pessoas >= 6 && r.status !== "cancelada");
  const pessoasReservadas = reservas.filter((r) => r.status !== "cancelada" && r.status !== "no_show").reduce((s, r) => s + r.pessoas, 0);

  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)}`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Hoje
      </Titulo>

      <Secao titulo="Pré-serviço" descricao="Ritual diário de 10 minutos antes de abrir" acoes={podeGerir(sessao.perfil) || sessao.perfil === "salao" ? <BotaoLink href={`/captura/salao?data=${data}`} secundario>Reservas e salão</BotaoLink> : null}>
        <Grade colunas={4}>
          <Indicador nome="Meta de clientes do dia" codigo="ponto_equilibrio_por_dia" valor={pe?.ponto_equilibrio_por_dia ?? null} tipo="numero" casas={0} falta={pe?.faltas.join("; ") || "DRE do mês (despesas, folha e vendas)"} detalhe="clientes por dia para o ponto de equilíbrio do mês" />
          <Indicador nome="Reservas do dia" valor={reservas.filter((r) => r.status !== "cancelada").length} tipo="numero" casas={0} detalhe={`${formatarInteiro(pessoasReservadas)} pessoas reservadas`} falta="reservas lançadas no salão" />
          <Indicador nome="Mesas grandes (6+)" valor={mesasGrandes.length} tipo="numero" casas={0} detalhe={mesasGrandes.map((m) => `${m.hora} ${m.nome ?? ""} (${m.pessoas})`).join(" · ") || "nenhuma"} />
          <Indicador nome="Escalados hoje" valor={escalados.length > 0 ? escalados.length : null} tipo="numero" casas={0} falta="escala da semana em Cadastro › Escalas" detalhe={escalados.map((e) => `${e.nome} (${e.cargo})`).join(" · ")} />
        </Grade>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="border border-cinza-claro bg-branco p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-cinza-escuro">Itens indisponíveis</div>
            {indisponiveis.length === 0 ? (
              <div className="text-sm text-cinza-escuro">Nenhum item marcado como indisponível para {formatarDataIso(data)}.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {indisponiveis.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <span>
                      {i.nome}
                      {i.motivo && <span className="text-cinza-escuro"> · {i.motivo}</span>}
                    </span>
                    <BotaoRemoverIndisponivel id={i.id} data={data} />
                  </li>
                ))}
              </ul>
            )}
            <FormularioIndisponivel data={data} produtos={produtos.map((p) => ({ id: p.id, nome: p.nome }))} />
          </div>
          <div className="border border-cinza-claro bg-branco p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-cinza-escuro">Ponto de padrão do dia</div>
            {padrao ? (
              <div className="text-sm">
                <div className="text-lg font-semibold">{padrao.nome}</div>
                <div className="text-cinza-escuro">
                  {padrao.bloco} · ficha versão {padrao.versao} · {padrao.fotoUrl ? "foto do padrão cadastrada" : "sem foto do padrão"}
                </div>
                <Link href={`/cadastro/fichas/${padrao.produtoId}`} className="mt-2 inline-block underline">
                  abrir a ficha e conferir a gramagem
                </Link>
              </div>
            ) : (
              <SemDado falta="fichas técnicas cadastradas" />
            )}
          </div>
        </div>
      </Secao>

      <Secao titulo="Painel do dia" descricao="Fechamento diário" acoes={podeGerir(sessao.perfil) ? <BotaoLink href={`/captura/fechamento?data=${data}`}>Fechar o dia</BotaoLink> : null}>
        {!venda && <Aviso nivel="info">Sem fechamento lançado para {formatarDataIso(data)}. Suba o export do Altec ou lance os números em Fechar o dia.</Aviso>}
        <Grade colunas={4}>
          <Indicador nome="Faturamento com taxa de serviço" valor={faturamentoComTaxa} tipo="reais" falta="fechamento do dia" detalhe={venda?.taxa_servico !== null && venda?.taxa_servico !== undefined ? `taxa de serviço ${formatarMoeda(venda.taxa_servico)}` : undefined} />
          <Indicador nome="Faturamento bruto (sem taxa)" valor={venda?.faturamento_bruto ?? null} tipo="reais" falta="fechamento do dia" detalhe={variacao !== null ? `${variacao >= 0 ? "+" : ""}${formatarPercentual(variacao)} contra ${nomeDiaSemana(semanaAnterior)} ${formatarDataIso(semanaAnterior)}` : `sem ${nomeDiaSemana(semanaAnterior)} anterior para comparar`} />
          <Indicador nome="Clientes" valor={venda?.clientes ?? null} tipo="numero" casas={0} falta="número de clientes no fechamento" detalhe={venda?.comandas ? `${formatarInteiro(venda.comandas)} comandas` : undefined} />
          <Indicador codigo="ticket_medio" nome="Ticket médio" valor={ticket} tipo="reais" falta="faturamento e clientes do dia" />
        </Grade>
        <div className="mt-3">
          <Grade colunas={4}>
            {(["cozinha", "salao", "bar", "delivery"] as const).map((seg) => (
              <Indicador key={seg} nome={`Segmento ${seg === "salao" ? "salão" : seg}`} valor={venda?.por_segmento?.[seg] ?? null} tipo="reais" falta="export diário por segmento" detalhe={venda?.faturamento_bruto && venda.por_segmento?.[seg] ? formatarPercentual(venda.por_segmento[seg]! / venda.faturamento_bruto) + " do dia" : undefined} />
            ))}
          </Grade>
        </div>
        <div className="mt-3">
          <Grade colunas={4}>
            <Indicador codigo="pratos_por_cozinheiro" nome="Pratos por cozinheiro" valor={pratosPorCozinheiro} tipo="numero" casas={1} falta="pratos vendidos no fechamento" detalhe={cozinheiros ? `${cozinheiros} cozinheiros no turno` : "cozinheiros em Parâmetros"} />
            <Indicador codigo="receita_por_garcom" nome="Receita por garçom" valor={receitaPorGarcom} tipo="reais" falta="export diário por colaborador" detalhe={garcons.length ? `${garcons.length} no turno` : undefined} />
            <Indicador nome="Receita por barman" valor={receitaPorBarman} tipo="reais" falta="export diário por colaborador" detalhe={barmans.length ? `${barmans.length} no turno` : undefined} />
            <Indicador nome="Divergência da conciliação" valor={conciliacao?.divergencia ?? null} tipo="reais" semaforo={conciliacao?.divergencia === 0 ? "otimo" : conciliacao ? "alerta" : null} falta="os quatro números da conciliação" detalhe={conciliacao ? `sistema ${formatarMoeda(conciliacao.vendas_sistema)} · adquirente ${formatarMoeda(conciliacao.recebido_adquirente)} · marketplace ${formatarMoeda(conciliacao.recebido_marketplace)} · pix e dinheiro ${formatarMoeda(conciliacao.recebido_pix_dinheiro)}` : undefined} />
          </Grade>
        </div>
        {venda?.teve_2x1 && (
          <div className="mt-3">
            <Grade colunas={4}>
              <Indicador codigo="cmv_2x1" nome="CMV do dia com 2x1" valor={dois?.cmv ?? null} tipo="pct" casas={2} meta={0.25} semaforo={dois?.cmv !== null && dois?.cmv !== undefined ? (dois.cmv <= 0.23 ? "otimo" : dois.cmv <= 0.25 ? "atencao" : "alerta") : null} falta="itens do R3 do dia com as gratuitas confirmadas" detalhe={dois ? `receita ${formatarMoeda(dois.receitaBruta)} · pagas ${formatarMoeda(dois.custoPagas)} · gratuitas ${formatarMoeda(dois.custoGratuitas)}${dois.aConfirmar > 0 ? ` · ${dois.aConfirmar} a confirmar` : ""}` : undefined} />
            </Grade>
          </div>
        )}
        {colaboradores.length > 0 && (
          <div className="mt-4">
            <Tabela cabecalho={[{ rotulo: "Colaborador" }, { rotulo: "Segmento" }, { rotulo: "Itens", num: true }, { rotulo: "Receita", num: true }]}>
              {colaboradores.map((c) => (
                <tr key={`${c.codigo}-${c.nome}-${c.segmento}`}>
                  <Td>{c.nome ?? c.codigo}</Td>
                  <Td>{c.segmento ?? "sem dado"}</Td>
                  <Td num>{formatarInteiro(c.itens)}</Td>
                  <Td num>{formatarMoeda(c.receita)}</Td>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
        {venda?.ocorrencia && (
          <div className="mt-4 border-l-2 border-preto pl-3 text-sm">
            <span className="text-cinza-escuro">Ocorrência do serviço: </span>
            {venda.ocorrencia}
          </div>
        )}
      </Secao>
    </>
  );
}
