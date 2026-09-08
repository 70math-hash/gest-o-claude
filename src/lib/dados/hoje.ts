import { bd, numero, rpc, rpcUm } from "./base";
import { somarDias, mesDeReferencia } from "@/formato";

export interface VendaDia {
  data: string;
  faturamento_bruto: number | null;
  taxa_servico: number | null;
  clientes: number | null;
  comandas: number | null;
  por_segmento: Record<string, number>;
  pratos_vendidos: number | null;
  teve_2x1: boolean;
  ocorrencia: string | null;
}

export async function vendaDoDia(data: string): Promise<VendaDia | null> {
  const { supabase, sessao } = await bd();
  const { data: linha } = await supabase.from("vendas_dia").select("*").eq("unidade_id", sessao.unidadeId).eq("data", data).maybeSingle();
  if (!linha) return null;
  return {
    data: linha.data,
    faturamento_bruto: numero(linha.faturamento_bruto),
    taxa_servico: numero(linha.taxa_servico),
    clientes: numero(linha.clientes),
    comandas: numero(linha.comandas),
    por_segmento: (linha.por_segmento ?? {}) as Record<string, number>,
    pratos_vendidos: numero(linha.pratos_vendidos),
    teve_2x1: Boolean(linha.teve_2x1),
    ocorrencia: linha.ocorrencia ?? null,
  };
}

export async function conciliacaoDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linha } = await supabase.from("conciliacao_dia").select("*").eq("unidade_id", sessao.unidadeId).eq("data", data).maybeSingle();
  if (!linha) return null;
  return {
    vendas_sistema: numero(linha.vendas_sistema),
    recebido_adquirente: numero(linha.recebido_adquirente),
    recebido_marketplace: numero(linha.recebido_marketplace),
    recebido_pix_dinheiro: numero(linha.recebido_pix_dinheiro),
    divergencia: numero(linha.divergencia),
  };
}

export async function colaboradoresDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("vendas_colaborador_dia").select("codigo, nome, segmento, receita, itens").eq("unidade_id", sessao.unidadeId).eq("data", data).order("receita", { ascending: false });
  return (linhas ?? []).map((l) => ({ codigo: l.codigo as string | null, nome: l.nome as string | null, segmento: l.segmento as string | null, receita: numero(l.receita) ?? 0, itens: numero(l.itens) ?? 0 }));
}

export async function reservasDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("reservas").select("id, hora, mesa, pessoas, nome, status, observacao").eq("unidade_id", sessao.unidadeId).eq("data", data).order("hora");
  return (linhas ?? []).map((l) => ({ id: l.id as string, hora: String(l.hora).slice(0, 5), mesa: l.mesa as string | null, pessoas: numero(l.pessoas) ?? 0, nome: l.nome as string | null, status: l.status as string, observacao: l.observacao as string | null }));
}

export async function indisponiveisDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("indisponiveis").select("id, produto_id, motivo, produtos(nome)").eq("unidade_id", sessao.unidadeId).eq("data", data);
  return (linhas ?? []).map((l) => {
    const p = l.produtos as unknown as { nome: string } | { nome: string }[] | null;
    return { id: l.id as string, produtoId: l.produto_id as string, motivo: l.motivo as string | null, nome: Array.isArray(p) ? (p[0]?.nome ?? "") : (p?.nome ?? "") };
  });
}

export async function pontoDePadraoDoDia(data: string) {
  // Roda o cardápio: um produto com ficha por dia, na ordem do nome.
  const { supabase, sessao } = await bd();
  const { data: fichas } = await supabase.from("fichas").select("produto_id, versao, foto_url, produtos(nome, bloco)").eq("unidade_id", sessao.unidadeId).is("vigencia_fim", null).order("produto_id");
  if (!fichas || fichas.length === 0) return null;
  const dia = Number(data.slice(8, 10));
  const escolhida = fichas[dia % fichas.length]!;
  const p = escolhida.produtos as unknown as { nome: string; bloco: string } | { nome: string; bloco: string }[] | null;
  const produto = Array.isArray(p) ? p[0] : p;
  return { produtoId: escolhida.produto_id as string, nome: produto?.nome ?? "", bloco: produto?.bloco ?? "", versao: escolhida.versao as number, fotoUrl: escolhida.foto_url as string | null };
}

export interface PontoEquilibrio {
  receita: number | null;
  ponto_equilibrio_reais: number | null;
  ponto_equilibrio_clientes: number | null;
  ponto_equilibrio_por_dia: number | null;
  dia_de_virada: string | null;
  margem_seguranca: number | null;
  ticket_medio: number | null;
  dias_abertos: number | null;
  mc_pct: number | null;
  faltas: string[];
}

export async function pontoEquilibrioDoMes(data: string): Promise<PontoEquilibrio | null> {
  const { sessao } = await bd();
  const mes = mesDeReferencia(data);
  const linha = await rpcUm<Record<string, unknown>>("v_ponto_equilibrio", { p_unidade: sessao.unidadeId, p_competencia: mes.inicio });
  if (!linha) return null;
  return {
    receita: numero(linha.receita),
    ponto_equilibrio_reais: numero(linha.ponto_equilibrio_reais),
    ponto_equilibrio_clientes: numero(linha.ponto_equilibrio_clientes),
    ponto_equilibrio_por_dia: numero(linha.ponto_equilibrio_por_dia),
    dia_de_virada: (linha.dia_de_virada as string | null) ?? null,
    margem_seguranca: numero(linha.margem_seguranca),
    ticket_medio: numero(linha.ticket_medio),
    dias_abertos: numero(linha.dias_abertos),
    mc_pct: numero(linha.mc_pct),
    faltas: (linha.faltas as string[]) ?? [],
  };
}

export async function cmvDia2x1(data: string) {
  const { sessao } = await bd();
  const linha = await rpcUm<Record<string, unknown>>("v_cmv_dia_2x1", { p_unidade: sessao.unidadeId, p_data: data });
  if (!linha) return null;
  return { receitaBruta: numero(linha.receita_bruta), custoPagas: numero(linha.custo_pagas), custoGratuitas: numero(linha.custo_gratuitas), custoTotal: numero(linha.custo_total), cmv: numero(linha.cmv), aConfirmar: numero(linha.gratuitas_a_confirmar) ?? 0 };
}

export async function parametrosDaCasa() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("parametros").select("*").eq("unidade_id", sessao.unidadeId).maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function escaladosDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("escalas").select("colaborador_id, colaboradores(nome, cargo, praca)").eq("unidade_id", sessao.unidadeId).eq("data", data);
  return (linhas ?? []).map((l) => {
    const c = l.colaboradores as unknown as { nome: string; cargo: string; praca: string | null } | { nome: string; cargo: string; praca: string | null }[] | null;
    const col = Array.isArray(c) ? c[0] : c;
    return { nome: col?.nome ?? "", cargo: col?.cargo ?? "", praca: col?.praca ?? null };
  });
}

export { somarDias, rpc };
