import { Suspense } from "react";
import { formatarCompetencia, hojeIso, mesDeReferencia } from "@/formato";
import { painelUnico } from "@/lib/dados/leitura";
import { FORMULAS } from "@/motor/formulas";
import { Grade, Indicador, Secao, Titulo, type TipoValor } from "@/componentes/ui";
import { SeletorMes } from "@/componentes/periodo";

export const metadata = { title: "Painel único" };

const GRUPOS: Array<{ titulo: string; codigos: string[] }> = [
  { titulo: "CMV e gap", codigos: ["cmv_ponderado_pizza", "cmv_ponderado_entrada", "cmv_ponderado_sobremesa", "cmv_real_cozinha", "cmv_real_bar", "cmv_real_casa", "gap_cozinha", "gap_bar", "perda_pct_cmv"] },
  { titulo: "Financeiro do mês", codigos: ["prime_cost_pct", "mc_pct", "resultado_operacional_pct", "ponto_equilibrio_reais", "ponto_equilibrio_por_dia", "dia_de_virada", "margem_seguranca", "folha_pct", "divergencia_conciliacao"] },
  { titulo: "Processo", codigos: ["aderencia_cronograma", "desvio_rendimento", "sobra_pct", "refugo_pct", "cobertura_pop", "redundancia"] },
  { titulo: "Gente", codigos: ["turnover_dieese", "turnover_interno", "tempo_medio_casa", "absenteismo", "horas_extras_pct", "receita_por_hora", "pratos_por_cozinheiro", "receita_por_garcom"] },
  { titulo: "Salão e clientes", codigos: ["ticket_medio", "giro_por_cadeira", "giro_por_mesa", "attach_entrada", "attach_sobremesa", "attach_bebida", "tempo_a_mesa", "no_show", "base_que_retorna", "retencao_90d"] },
  { titulo: "Risco", codigos: ["documentos_risco"] },
];

const NOMES: Record<string, string> = {
  cmv_ponderado_pizza: "CMV pizzas", cmv_ponderado_entrada: "CMV entradas", cmv_ponderado_sobremesa: "CMV sobremesas", cmv_real_cozinha: "CMV real cozinha", cmv_real_bar: "CMV real bar", cmv_real_casa: "CMV real da casa",
  gap_cozinha: "Gap cozinha", gap_bar: "Gap bar", perda_pct_cmv: "Perdas sobre o CMV", prime_cost_pct: "Prime cost", mc_pct: "Margem de contribuição", resultado_operacional_pct: "Resultado operacional",
  ponto_equilibrio_reais: "Ponto de equilíbrio", ponto_equilibrio_por_dia: "Clientes por dia para o equilíbrio", dia_de_virada: "Dia de virada", margem_seguranca: "Margem de segurança", folha_pct: "Folha sobre a receita", divergencia_conciliacao: "Divergência de conciliação",
  aderencia_cronograma: "Aderência ao cronograma", desvio_rendimento: "Desvio de rendimento", sobra_pct: "Sobra", refugo_pct: "Refugo", cobertura_pop: "Cobertura de POP", redundancia: "Processos sem redundância",
  turnover_dieese: "Turnover DIEESE", turnover_interno: "Turnover interno", tempo_medio_casa: "Tempo médio de casa", absenteismo: "Absenteísmo", horas_extras_pct: "Horas extras", receita_por_hora: "Receita por hora", pratos_por_cozinheiro: "Pratos por cozinheiro", receita_por_garcom: "Receita por garçom",
  ticket_medio: "Ticket médio", giro_por_cadeira: "Giro por cadeira", giro_por_mesa: "Giro por mesa", attach_entrada: "Attach de entrada", attach_sobremesa: "Attach de sobremesa", attach_bebida: "Attach de bebida", tempo_a_mesa: "Tempo à mesa", no_show: "No-show", base_que_retorna: "Base que retorna", retencao_90d: "Retenção em 90 dias",
  documentos_risco: "Documentos vencendo ou vencidos",
};

const CODIGO_FORMULA: Record<string, string> = {
  cmv_ponderado_pizza: "cmv_ponderado_bloco", cmv_ponderado_entrada: "cmv_ponderado_bloco", cmv_ponderado_sobremesa: "cmv_ponderado_bloco", cmv_real_cozinha: "cmv_real_pct", cmv_real_bar: "cmv_real_pct", cmv_real_casa: "cmv_real_pct",
  gap_cozinha: "gap_controle", gap_bar: "gap_controle", resultado_operacional_pct: "resultado_operacional", documentos_risco: "",
};

export default async function PaginaPainel({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: param } = await searchParams;
  const competencia = param && /^\d{4}-\d{2}$/.test(param) ? param : hojeIso().slice(0, 7);
  const { inicio, fim } = mesDeReferencia(`${competencia}-01`);
  const painel = await painelUnico(inicio, fim);
  const comDado = painel.filter((p) => p.valor !== null).length;
  return (
    <>
      <Titulo sub={`Todos os indicadores da apostila · ${formatarCompetencia(inicio)} · ${comDado} de ${painel.length} com dado`} acoes={<Suspense><SeletorMes competencia={competencia} /></Suspense>}>
        Painel único
      </Titulo>
      <p className="mb-6 text-sm text-cinza-escuro">Toque num indicador para ver a fórmula, o dono, a origem e a frequência. Onde não há dado, o painel diz o lançamento que falta. Semáforo em quatro tons: branco ótimo, cinza claro atenção, cinza alerta, preto crítico.</p>
      {GRUPOS.map((g) => (
        <Secao key={g.titulo} titulo={g.titulo}>
          <Grade colunas={4}>
            {g.codigos.map((codigo) => {
              const p = painel.find((x) => x.codigo === codigo);
              const codigoFormula = CODIGO_FORMULA[codigo] ?? codigo;
              const formula = FORMULAS.find((f) => f.codigo === codigoFormula);
              return (
                <Indicador key={codigo} codigo={formula ? codigoFormula : undefined} nome={NOMES[codigo] ?? codigo} valor={p?.valor ?? null} tipo={(p?.tipo as TipoValor) ?? "numero"} meta={p?.meta ?? null} semaforo={p?.semaforo ?? null} falta={p?.falta ?? "indicador não calculado"} detalhe={p?.detalhe ?? null} casas={p?.tipo === "pp" || p?.tipo === "pct" ? 1 : p?.tipo === "reais" ? 2 : 1} />
              );
            })}
          </Grade>
        </Secao>
      ))}
    </>
  );
}
