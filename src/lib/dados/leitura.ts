import { bd, numero, rpc, rpcUm } from "./base";

const n = numero;

export interface CmvBloco {
  bloco: string;
  qtde: number;
  custoTotal: number | null;
  receitaLiquida: number;
  receitaTabela: number;
  cmvOperacional: number | null;
  cmvTabela: number | null;
  meta: number | null;
  teto: number | null;
  itensSemCusto: number;
  linhasSemProduto: number;
}

export async function cmvPonderadoBloco(inicio: string, fim: string): Promise<CmvBloco[]> {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_cmv_ponderado_bloco", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ bloco: String(l.bloco), qtde: n(l.qtde) ?? 0, custoTotal: n(l.custo_total), receitaLiquida: n(l.receita_liquida) ?? 0, receitaTabela: n(l.receita_tabela) ?? 0, cmvOperacional: n(l.cmv_operacional), cmvTabela: n(l.cmv_tabela), meta: n(l.meta_pct), teto: n(l.teto_pct), itensSemCusto: n(l.itens_sem_custo) ?? 0, linhasSemProduto: n(l.linhas_sem_produto) ?? 0 }));
}

export async function gapControle(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_gap_controle", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ base: String(l.base), periodoInicio: (l.periodo_inicio as string | null) ?? null, periodoFim: (l.periodo_fim as string | null) ?? null, cmvReal: n(l.cmv_real_pct), cmvTeorico: n(l.cmv_teorico_pct), gap: n(l.gap), alerta: Boolean(l.alerta), parcial: Boolean(l.parcial), gapReais: n(l.gap_reais), perdas: n(l.perdas_registradas), cortesias: n(l.cortesias_registradas), naoExplicado: n(l.nao_explicado), faltas: (l.faltas as string[]) ?? [] }));
}

export async function gapParcialItensA(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_gap_parcial_itens_a", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ insumo: String(l.insumo), dataInicial: String(l.data_inicial), dataFinal: String(l.data_final), consumoReal: n(l.consumo_real), consumoTeorico: n(l.consumo_teorico), diferenca: n(l.diferenca), diferencaReais: n(l.diferenca_reais) }));
}

export async function cmvRealBase(inicio: string, fim: string, base: "cozinha" | "bar") {
  const { sessao } = await bd();
  const l = await rpcUm<Record<string, unknown>>("v_cmv_real_base", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim, p_base: base });
  if (!l) return null;
  return { base, dataInicial: (l.data_inventario_inicial as string | null) ?? null, dataFinal: (l.data_inventario_final as string | null) ?? null, estoqueInicial: n(l.estoque_inicial), compras: n(l.compras), estoqueFinal: n(l.estoque_final), cmvReais: n(l.cmv_real_reais), receita: n(l.receita), origemReceita: (l.origem_receita as string | null) ?? null, cmvPct: n(l.cmv_real_pct), faltas: (l.faltas as string[]) ?? [] };
}

export async function aderenciaPorDia(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_aderencia_cronograma", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ data: String(l.data), etapas: n(l.etapas) ?? 0, conferidas: n(l.conferidas_na_janela) ?? 0, aderencia: n(l.aderencia), atrasadas: (l.atrasadas as string[]) ?? [] }));
}

export async function sobraPorItem(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_sobra", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ item: String(l.item), tipo: String(l.tipo), dias: n(l.dias) ?? 0, produzido: n(l.produzido), sobra: n(l.sobra), sobraPct: n(l.sobra_pct), refugoPct: n(l.refugo_pct), diasSeguidos: n(l.dias_seguidos_acima) ?? 0, alerta: Boolean(l.alerta) }));
}

export async function attachPeriodo(inicio: string, fim: string) {
  const { sessao } = await bd();
  const l = await rpcUm<Record<string, unknown>>("v_attach", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  if (!l) return null;
  return { mesas: n(l.mesas) ?? 0, entrada: n(l.attach_entrada), sobremesa: n(l.attach_sobremesa), bebida: n(l.attach_bebida), tempoMedio: n(l.tempo_medio_mesa_min), semDetalhe: n(l.mesas_sem_detalhe) ?? 0 };
}

export async function giroPorDia(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_giro", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ data: String(l.data), receita: n(l.receita), clientes: n(l.clientes), ticket: n(l.ticket_medio), giroCadeira: n(l.giro_por_cadeira), atendimentos: n(l.atendimentos) ?? 0, giroMesa: n(l.giro_por_mesa) }));
}

export async function turnover(inicio: string, fim: string) {
  const { sessao } = await bd();
  const l = await rpcUm<Record<string, unknown>>("v_turnover", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  if (!l) return null;
  return { admissoes: n(l.admissoes) ?? 0, desligamentos: n(l.desligamentos) ?? 0, efetivoMedio: n(l.efetivo_medio), dieese: n(l.turnover_dieese), interno: n(l.turnover_interno), tempoMedioCasa: n(l.tempo_medio_casa_meses) };
}

export async function horasEquipe(inicio: string, fim: string) {
  const { sessao } = await bd();
  const l = await rpcUm<Record<string, unknown>>("v_horas_equipe", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  if (!l) return null;
  return { diasEscalados: n(l.dias_escalados) ?? 0, faltas: n(l.faltas_nao_programadas) ?? 0, absenteismo: n(l.absenteismo), previstas: n(l.horas_previstas), trabalhadas: n(l.horas_trabalhadas), extras: n(l.horas_extras) };
}

export interface LinhaDre {
  ordem: number;
  codigo: string;
  linha: string;
  valor: number | null;
  vertical: number | null;
  orcamento: number | null;
  orcamentoVertical: number | null;
  desvio: number | null;
  origem: string | null;
  falta: string | null;
}

export async function dreVertical(competencia: string): Promise<LinhaDre[]> {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_dre_vertical", { p_unidade: sessao.unidadeId, p_competencia: competencia });
  return linhas.map((l) => ({ ordem: n(l.ordem) ?? 0, codigo: String(l.codigo), linha: String(l.linha), valor: n(l.valor), vertical: n(l.vertical), orcamento: n(l.orcamento), orcamentoVertical: n(l.orcamento_vertical), desvio: n(l.desvio), origem: (l.origem as string | null) ?? null, falta: (l.falta as string | null) ?? null }));
}

export async function primeCost(competencia: string) {
  const { sessao } = await bd();
  const l = await rpcUm<Record<string, unknown>>("v_prime_cost", { p_unidade: sessao.unidadeId, p_competencia: competencia });
  if (!l) return null;
  return { receita: n(l.receita), cmv: n(l.cmv), folha: n(l.folha), pct: n(l.prime_cost_pct), faltas: (l.faltas as string[]) ?? [] };
}

export interface LinhaPainel {
  codigo: string;
  valor: number | null;
  tipo: string;
  meta: number | null;
  teto: number | null;
  semaforo: string | null;
  falta: string | null;
  detalhe: string | null;
}

export async function painelUnico(inicio: string, fim: string): Promise<LinhaPainel[]> {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_painel_unico", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ codigo: String(l.codigo), valor: n(l.valor), tipo: String(l.tipo_valor), meta: n(l.meta), teto: n(l.teto), semaforo: (l.semaforo as string | null) ?? null, falta: (l.falta as string | null) ?? null, detalhe: (l.detalhe as string | null) ?? null }));
}

export interface LinhaCanal {
  canalId: string;
  canal: string;
  tipo: string;
  entregaPor: string;
  comissao: number | null;
  taxa: number | null;
  embalagem: number;
  entrega: number;
  preco: number | null;
  custo: number | null;
  margem: number | null;
  indice: number | null;
  precoEquivalencia: number | null;
  falta: string | null;
}

export async function margemCanal(produtoId: string, data: string): Promise<LinhaCanal[]> {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_margem_canal", { p_unidade: sessao.unidadeId, p_produto: produtoId, p_data: data });
  return linhas.map((l) => ({ canalId: String(l.canal_id), canal: String(l.canal), tipo: String(l.tipo), entregaPor: String(l.entrega_por), comissao: n(l.comissao_pct), taxa: n(l.taxa_pagamento_pct), embalagem: n(l.embalagem) ?? 0, entrega: n(l.entrega) ?? 0, preco: n(l.preco), custo: n(l.custo), margem: n(l.margem), indice: n(l.indice), precoEquivalencia: n(l.preco_equivalencia), falta: (l.falta as string | null) ?? null }));
}

export interface ItemEngenharia {
  produtoId: string;
  nome: string;
  qtde: number;
  receita: number;
  precoMedio: number | null;
  custo: number | null;
  cmv: number | null;
  margem: number | null;
  margem90d: number | null;
  participacao: number | null;
  popularidadeAlta: boolean | null;
  margemAlta: boolean | null;
  quadrante: string | null;
  numeroItens: number;
  unidades: number;
  piso: number | null;
  cmvPonderado: number | null;
  margemMedia: number | null;
  fator: number;
  falta: string | null;
}

export async function engenharia(inicio: string, fim: string, bloco: string, matriz: "kasavana_smith" | "miller"): Promise<ItemEngenharia[]> {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_engenharia_cardapio", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim, p_bloco: bloco, p_matriz: matriz });
  return linhas.map((l) => ({ produtoId: String(l.produto_id), nome: String(l.nome), qtde: n(l.qtde) ?? 0, receita: n(l.receita) ?? 0, precoMedio: n(l.preco_medio), custo: n(l.custo), cmv: n(l.cmv), margem: n(l.margem_contribuicao), margem90d: n(l.margem_90d), participacao: n(l.participacao), popularidadeAlta: l.popularidade_alta as boolean | null, margemAlta: l.margem_alta as boolean | null, quadrante: (l.quadrante as string | null) ?? null, numeroItens: n(l.numero_itens) ?? 0, unidades: n(l.unidades) ?? 0, piso: n(l.piso_popularidade_unidades), cmvPonderado: n(l.cmv_ponderado), margemMedia: n(l.margem_media_ponderada), fator: n(l.fator) ?? 0.7, falta: (l.falta as string | null) ?? null }));
}

export async function cmvTeoricoItens(data: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_cmv_teorico_item", { p_unidade: sessao.unidadeId, p_data: data });
  return linhas.map((l) => ({ produtoId: String(l.produto_id), nome: String(l.nome), bloco: String(l.bloco), secao: (l.secao as string | null) ?? null, preco: n(l.preco_venda), custo: n(l.custo), custoAltec: n(l.custo_altec), origemCusto: (l.origem_custo as string | null) ?? null, faltas: (l.faltas as string[]) ?? [], cmv: n(l.cmv_teorico), cmvAltec: n(l.cmv_altec), distorcao: n(l.distorcao), alertaDistorcao: Boolean(l.alerta_distorcao), insumoDistorcao: (l.insumo_maior_distorcao as string | null) ?? null, meta: n(l.meta_pct), teto: n(l.teto_pct), acimaDaMeta: Boolean(l.acima_da_meta), critico: Boolean(l.critico), precoMinimo: n(l.preco_minimo), precoSugerido: n(l.preco_sugerido), piso: n(l.piso), tetoFaixa: n(l.teto), faixa: (l.situacao_faixa as string | null) ?? null }));
}

export async function ocorrenciasDoPeriodo(inicio: string, fim: string) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("vendas_dia").select("data, ocorrencia").eq("unidade_id", sessao.unidadeId).gte("data", inicio).lte("data", fim).not("ocorrencia", "is", null).order("data");
  return (data ?? []).map((l) => ({ data: l.data as string, texto: l.ocorrencia as string }));
}

export async function caixaProjecao(aPartirDe: string) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("caixa_projecao").select("id, semana_inicio, entradas_previstas, saidas_previstas, saldo_inicial, saldo_projetado, observacao").eq("unidade_id", sessao.unidadeId).gte("semana_inicio", aPartirDe).order("semana_inicio").limit(13);
  return (data ?? []).map((l) => ({ id: l.id as string, semana: l.semana_inicio as string, entradas: n(l.entradas_previstas) ?? 0, saidas: n(l.saidas_previstas) ?? 0, saldoInicial: n(l.saldo_inicial), saldoProjetado: n(l.saldo_projetado), observacao: (l.observacao as string | null) ?? null }));
}

export async function escalaContraCurva(inicioSemana: string) {
  const { supabase, sessao } = await bd();
  const fim = new Date(`${inicioSemana}T12:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + 5);
  const fimIso = fim.toISOString().slice(0, 10);
  const historicoInicio = new Date(`${inicioSemana}T12:00:00Z`);
  historicoInicio.setUTCDate(historicoInicio.getUTCDate() - 56);
  const [escalas, vendas] = await Promise.all([
    supabase.from("escalas").select("data, colaborador_id").eq("unidade_id", sessao.unidadeId).gte("data", inicioSemana).lte("data", fimIso),
    supabase.from("vendas_dia").select("data, clientes, faturamento_bruto").eq("unidade_id", sessao.unidadeId).gte("data", historicoInicio.toISOString().slice(0, 10)).lt("data", inicioSemana),
  ]);
  const porDow = new Map<number, { clientes: number[]; receita: number[] }>();
  for (const v of vendas.data ?? []) {
    const dow = new Date(`${v.data}T12:00:00Z`).getUTCDay();
    const e = porDow.get(dow) ?? { clientes: [], receita: [] };
    if (v.clientes !== null) e.clientes.push(Number(v.clientes));
    if (v.faturamento_bruto !== null) e.receita.push(Number(v.faturamento_bruto));
    porDow.set(dow, e);
  }
  const dias: Array<{ data: string; escalados: number; mediaClientes: number | null; mediaReceita: number | null }> = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(`${inicioSemana}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const h = porDow.get(d.getUTCDay());
    const media = (xs: number[] | undefined) => (xs && xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
    dias.push({ data: iso, escalados: (escalas.data ?? []).filter((e) => e.data === iso).length, mediaClientes: media(h?.clientes), mediaReceita: media(h?.receita) });
  }
  return dias;
}

export async function insumosClasseAComImpacto(data: string) {
  const { supabase, sessao } = await bd();
  const { data: insumos } = await supabase.from("insumos").select("id, nome, curva_abc, unidade_uso").eq("unidade_id", sessao.unidadeId).eq("ativo", true).eq("curva_abc", "A").order("nome");
  const resultado: Array<{ id: string; nome: string; unidade: string; preco: number | null; rendimento: number | null; desde: string | null; origem: string | null; fichas: number }> = [];
  for (const i of insumos ?? []) {
    const [{ data: p }, { count }] = await Promise.all([
      supabase.rpc("f_preco_insumo", { p_insumo: i.id, p_data: data }),
      supabase.from("ficha_itens").select("id", { count: "exact", head: true }).eq("insumo_id", i.id),
    ]);
    const preco = Array.isArray(p) && p[0] ? p[0] : null;
    resultado.push({ id: i.id as string, nome: i.nome as string, unidade: i.unidade_uso as string, preco: preco ? n(preco.preco) : null, rendimento: preco ? n(preco.rendimento) : null, desde: preco ? (preco.vigencia_inicio as string) : null, origem: preco ? (preco.origem as string) : null, fichas: count ?? 0 });
  }
  return resultado;
}

export async function matrizPolivalencia() {
  const { supabase, sessao } = await bd();
  const [colaboradores, processos, certificacoes] = await Promise.all([
    supabase.from("colaboradores").select("id, nome, cargo").eq("unidade_id", sessao.unidadeId).is("desligamento", null).order("nome"),
    supabase.from("processos_criticos").select("id, nome, praca").eq("unidade_id", sessao.unidadeId).eq("ativo", true).order("nome"),
    supabase.from("certificacoes").select("colaborador_id, processo_id, nivel, data").eq("unidade_id", sessao.unidadeId).order("data"),
  ]);
  const nivel = new Map<string, number>();
  for (const c of certificacoes.data ?? []) nivel.set(`${c.colaborador_id}:${c.processo_id}`, Number(c.nivel));
  return {
    colaboradores: (colaboradores.data ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string, cargo: c.cargo as string })),
    processos: (processos.data ?? []).map((p) => ({ id: p.id as string, nome: p.nome as string, praca: (p.praca as string | null) ?? null })),
    nivel: (colaboradorId: string, processoId: string) => nivel.get(`${colaboradorId}:${processoId}`) ?? null,
    certificadosNivel2: (processoId: string) => [...nivel.entries()].filter(([k, v]) => k.endsWith(`:${processoId}`) && v >= 2).length,
  };
}

export async function decisoesEngenharia(limite = 12) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("decisoes_engenharia").select("id, data, bloco, matriz, periodo_inicio, periodo_fim, decisao").eq("unidade_id", sessao.unidadeId).order("data", { ascending: false }).limit(limite);
  return (data ?? []).map((d) => ({ id: d.id as string, data: d.data as string, bloco: d.bloco as string, matriz: d.matriz as string, inicio: d.periodo_inicio as string, fim: d.periodo_fim as string, decisao: (d.decisao as string | null) ?? null }));
}
