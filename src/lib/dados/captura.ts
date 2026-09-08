import { bd, numero, rpc } from "./base";

export async function perdasDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("perdas").select("id, quantidade, motivo, valor, produtos(nome), insumos(nome)").eq("unidade_id", sessao.unidadeId).eq("data", data).order("criado_em");
  return (linhas ?? []).map((l) => {
    const p = l.produtos as unknown as { nome: string } | { nome: string }[] | null;
    const i = l.insumos as unknown as { nome: string } | { nome: string }[] | null;
    const nome = (Array.isArray(p) ? p[0]?.nome : p?.nome) ?? (Array.isArray(i) ? i[0]?.nome : i?.nome) ?? "";
    return { id: l.id as string, item: nome, quantidade: numero(l.quantidade) ?? 0, motivo: l.motivo as string, valor: numero(l.valor) };
  });
}

export interface LinhaProducaoDia {
  chave: string;
  tipo: "produto" | "producao";
  id: string;
  nome: string;
  bloco: string | null;
  sugerido: number | null;
  faltaSugestao: string | null;
  planejado: number | null;
  produzido: number | null;
  sobra: number | null;
  refeitos: number | null;
}

export async function producaoDoDia(data: string): Promise<LinhaProducaoDia[]> {
  const { supabase, sessao } = await bd();
  const [sugestoes, producoes, lancadas] = await Promise.all([
    rpc<Record<string, unknown>>("v_producao_sugerida", { p_unidade: sessao.unidadeId, p_data: data, p_fator_sazonal: 1 }),
    supabase.from("producoes").select("id, nome").eq("unidade_id", sessao.unidadeId).eq("ativo", true).order("nome"),
    supabase.from("producao_diaria").select("producao_id, produto_id, planejado, produzido, sobra, refeitos").eq("unidade_id", sessao.unidadeId).eq("data", data),
  ]);
  const porChave = new Map<string, Record<string, unknown>>();
  for (const l of lancadas.data ?? []) porChave.set(l.producao_id ? `producao:${l.producao_id}` : `produto:${l.produto_id}`, l);
  const linhas: LinhaProducaoDia[] = [];
  for (const s of sugestoes) {
    const chave = `produto:${s.produto_id}`;
    const l = porChave.get(chave);
    linhas.push({ chave, tipo: "produto", id: String(s.produto_id), nome: String(s.nome), bloco: null, sugerido: numero(s.producao_sugerida), faltaSugestao: (s.falta as string | null) ?? null, planejado: numero(l?.planejado), produzido: numero(l?.produzido), sobra: numero(l?.sobra), refeitos: numero(l?.refeitos) });
  }
  for (const p of producoes.data ?? []) {
    const chave = `producao:${p.id}`;
    const l = porChave.get(chave);
    linhas.push({ chave, tipo: "producao", id: p.id as string, nome: p.nome as string, bloco: "produção", sugerido: null, faltaSugestao: "sugestão por batelada não se aplica; informe o planejado", planejado: numero(l?.planejado), produzido: numero(l?.produzido), sobra: numero(l?.sobra), refeitos: numero(l?.refeitos) });
  }
  return linhas;
}

export async function bateladasDoPeriodo(inicio: string, fim: string) {
  const { sessao } = await bd();
  const linhas = await rpc<Record<string, unknown>>("v_desvio_rendimento", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim });
  return linhas.map((l) => ({ id: String(l.batelada_id), data: String(l.data), producao: String(l.producao), real: numero(l.rendimento_real), declarado: numero(l.rendimento_declarado), desvio: numero(l.desvio), alerta: Boolean(l.alerta) }));
}

export async function cronogramaDoDia(data: string) {
  const { supabase, sessao } = await bd();
  let { data: etapas } = await supabase.from("cronograma_etapas").select("id, etapa, praca, hora_inicio, hora_fim, conferido_em, conferido_por, ordem").eq("unidade_id", sessao.unidadeId).eq("data", data).order("ordem");
  if (!etapas || etapas.length === 0) {
    await supabase.rpc("f_gerar_cronograma_dia", { p_unidade: sessao.unidadeId, p_data: data });
    const r = await supabase.from("cronograma_etapas").select("id, etapa, praca, hora_inicio, hora_fim, conferido_em, conferido_por, ordem").eq("unidade_id", sessao.unidadeId).eq("data", data).order("ordem");
    etapas = r.data;
  }
  return (etapas ?? []).map((e) => ({ id: e.id as string, etapa: e.etapa as string, praca: (e.praca as string | null) ?? null, horaInicio: e.hora_inicio as string, horaFim: e.hora_fim as string, conferidoEm: (e.conferido_em as string | null) ?? null, ordem: numero(e.ordem) ?? 0 }));
}

export async function checklistModelo() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("checklist_modelo").select("praca, tipo, itens").eq("unidade_id", sessao.unidadeId).eq("ativo", true);
  return (data ?? []).map((m) => ({ praca: m.praca as string, tipo: m.tipo as string, itens: (m.itens as string[]) ?? [] }));
}

export async function checklistsDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("checklists").select("id, praca, tipo, itens_json, assinado_em").eq("unidade_id", sessao.unidadeId).eq("data", data);
  return (linhas ?? []).map((c) => ({ id: c.id as string, praca: c.praca as string, tipo: c.tipo as string, itens: (c.itens_json as Array<{ item: string; ok: boolean }>) ?? [], assinadoEm: (c.assinado_em as string | null) ?? null }));
}

export async function comprasRecentes(limite = 10) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("compras").select("id, data, nota_numero, total, fornecedores(nome), compra_itens(count)").eq("unidade_id", sessao.unidadeId).order("data", { ascending: false }).limit(limite);
  return (data ?? []).map((c) => {
    const f = c.fornecedores as unknown as { nome: string } | { nome: string }[] | null;
    const itens = c.compra_itens as unknown as Array<{ count: number }> | null;
    return { id: c.id as string, data: c.data as string, nota: (c.nota_numero as string | null) ?? null, total: numero(c.total), fornecedor: (Array.isArray(f) ? f[0]?.nome : f?.nome) ?? null, itens: itens?.[0]?.count ?? 0 };
  });
}

export async function inventariosRecentes(limite = 10) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("inventarios").select("id, data, tipo, base, fechado, inventario_itens(count)").eq("unidade_id", sessao.unidadeId).order("data", { ascending: false }).limit(limite);
  return (data ?? []).map((i) => {
    const itens = i.inventario_itens as unknown as Array<{ count: number }> | null;
    return { id: i.id as string, data: i.data as string, tipo: i.tipo as string, base: i.base as string, fechado: Boolean(i.fechado), itens: itens?.[0]?.count ?? 0 };
  });
}

export async function insumosParaContagem(base: string, apenasClasseA: boolean, data: string) {
  const { supabase, sessao } = await bd();
  let consulta = supabase.from("insumos").select("id, nome, unidade_uso, curva_abc, categoria").eq("unidade_id", sessao.unidadeId).eq("ativo", true).eq("base", base).order("categoria").order("nome");
  if (apenasClasseA) consulta = consulta.eq("curva_abc", "A");
  const { data: insumos } = await consulta;
  const resultado: Array<{ id: string; nome: string; unidade: string; curva: string | null; categoria: string | null; preco: number | null }> = [];
  for (const i of insumos ?? []) {
    const { data: p } = await supabase.rpc("f_preco_insumo", { p_insumo: i.id, p_data: data });
    const preco = Array.isArray(p) && p[0] ? numero(p[0].preco) : null;
    resultado.push({ id: i.id as string, nome: i.nome as string, unidade: i.unidade_uso as string, curva: (i.curva_abc as string | null) ?? null, categoria: (i.categoria as string | null) ?? null, preco });
  }
  return resultado;
}

export async function atendimentosDoDia(data: string) {
  const { supabase, sessao } = await bd();
  const { data: linhas } = await supabase.from("atendimentos").select("id, mesa, comanda, clientes, chegada, saida, teve_entrada, teve_sobremesa, teve_bebida, total, colaboradores(nome)").eq("unidade_id", sessao.unidadeId).eq("data", data).order("chegada");
  return (linhas ?? []).map((a) => {
    const g = a.colaboradores as unknown as { nome: string } | { nome: string }[] | null;
    return { id: a.id as string, mesa: (a.mesa as string | null) ?? null, comanda: (a.comanda as string | null) ?? null, clientes: numero(a.clientes), chegada: (a.chegada as string | null) ?? null, saida: (a.saida as string | null) ?? null, teveEntrada: a.teve_entrada as boolean | null, teveSobremesa: a.teve_sobremesa as boolean | null, teveBebida: a.teve_bebida as boolean | null, total: numero(a.total), garcom: (Array.isArray(g) ? g[0]?.nome : g?.nome) ?? null };
  });
}

export async function documentosRisco() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("documentos_risco").select("id, nome, tipo, vencimento, alerta_dias, colaboradores(nome)").eq("unidade_id", sessao.unidadeId).order("vencimento");
  return (data ?? []).map((d) => {
    const r = d.colaboradores as unknown as { nome: string } | { nome: string }[] | null;
    return { id: d.id as string, nome: d.nome as string, tipo: d.tipo as string, vencimento: d.vencimento as string, alertaDias: numero(d.alerta_dias) ?? 60, responsavel: (Array.isArray(r) ? r[0]?.nome : r?.nome) ?? null };
  });
}
