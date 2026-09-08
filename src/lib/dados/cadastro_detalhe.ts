import { bd, numero } from "./base";

const n = numero;

export async function insumosComPreco() {
  const { supabase, sessao } = await bd();
  const [insumos, precos, fornecedores] = await Promise.all([
    supabase.from("insumos").select("id, nome, categoria, base, unidade_uso, curva_abc, ativo, codigo_altec").eq("unidade_id", sessao.unidadeId).order("categoria").order("nome"),
    supabase.from("insumo_precos").select("insumo_id, preco_por_unidade, rendimento_pct, vigencia_inicio, origem").eq("unidade_id", sessao.unidadeId).is("vigencia_fim", null),
    supabase.from("insumo_fornecedores").select("insumo_id, fornecedores(homologado)").eq("unidade_id", sessao.unidadeId),
  ]);
  const preco = new Map((precos.data ?? []).map((p) => [p.insumo_id as string, p]));
  const homologados = new Map<string, number>();
  for (const f of fornecedores.data ?? []) {
    const h = f.fornecedores as unknown as { homologado: boolean } | { homologado: boolean }[] | null;
    const ok = Array.isArray(h) ? h[0]?.homologado : h?.homologado;
    if (ok) homologados.set(f.insumo_id as string, (homologados.get(f.insumo_id as string) ?? 0) + 1);
  }
  return (insumos.data ?? []).map((i) => {
    const p = preco.get(i.id as string);
    return { id: i.id as string, nome: i.nome as string, categoria: (i.categoria as string | null) ?? null, base: i.base as string, unidade: i.unidade_uso as string, curva: (i.curva_abc as string | null) ?? null, ativo: Boolean(i.ativo), codigoAltec: (i.codigo_altec as string | null) ?? null, preco: p ? n(p.preco_por_unidade) : null, rendimento: p ? n(p.rendimento_pct) : null, desde: p ? (p.vigencia_inicio as string) : null, origem: p ? (p.origem as string) : null, homologados: homologados.get(i.id as string) ?? 0 };
  });
}

export async function insumoDetalhe(id: string) {
  const { supabase, sessao } = await bd();
  const [insumo, precos, vinculos, fornecedores] = await Promise.all([
    supabase.from("insumos").select("*").eq("id", id).eq("unidade_id", sessao.unidadeId).maybeSingle(),
    supabase.from("insumo_precos").select("id, preco_por_unidade, rendimento_pct, vigencia_inicio, vigencia_fim, origem").eq("insumo_id", id).order("vigencia_inicio", { ascending: false }),
    supabase.from("insumo_fornecedores").select("id, fornecedor_id").eq("insumo_id", id),
    supabase.from("fornecedores").select("id, nome, homologado").eq("unidade_id", sessao.unidadeId).order("nome"),
  ]);
  if (!insumo.data) return null;
  const vinculados = new Set((vinculos.data ?? []).map((v) => v.fornecedor_id as string));
  return {
    insumo: insumo.data as Record<string, unknown>,
    precos: (precos.data ?? []).map((p) => ({ id: p.id as string, preco: n(p.preco_por_unidade), rendimento: n(p.rendimento_pct), inicio: p.vigencia_inicio as string, fim: (p.vigencia_fim as string | null) ?? null, origem: p.origem as string })),
    fornecedores: (fornecedores.data ?? []).map((f) => ({ id: f.id as string, nome: f.nome as string, homologado: Boolean(f.homologado), vinculado: vinculados.has(f.id as string) })),
  };
}

export async function producoesComCusto() {
  const { supabase, sessao } = await bd();
  const [producoes, custos] = await Promise.all([
    supabase.from("producoes").select("id, codigo_altec, nome, base, unidade_rendimento, rendimento_declarado, rendimento_uso_pct, ativo, observacao").eq("unidade_id", sessao.unidadeId).order("nome"),
    supabase.from("producao_custos").select("producao_id, custo_por_unidade, custo_batelada, origem, vigencia_inicio").eq("unidade_id", sessao.unidadeId).is("vigencia_fim", null),
  ]);
  const custo = new Map((custos.data ?? []).map((c) => [c.producao_id as string, c]));
  return (producoes.data ?? []).map((p) => {
    const c = custo.get(p.id as string);
    return { id: p.id as string, codigoAltec: (p.codigo_altec as string | null) ?? null, nome: p.nome as string, base: p.base as string, unidade: p.unidade_rendimento as string, rendimento: n(p.rendimento_declarado), rendimentoUso: n(p.rendimento_uso_pct) ?? 1, ativo: Boolean(p.ativo), observacao: (p.observacao as string | null) ?? null, custo: c ? n(c.custo_por_unidade) : null, custoBatelada: c ? n(c.custo_batelada) : null, origem: c ? (c.origem as string) : null, desde: c ? (c.vigencia_inicio as string) : null };
  });
}

export async function producaoDetalhe(id: string) {
  const { supabase, sessao } = await bd();
  const [producao, itens, custos] = await Promise.all([
    supabase.from("producoes").select("*").eq("id", id).eq("unidade_id", sessao.unidadeId).maybeSingle(),
    supabase.from("producao_itens").select("id, quantidade, unidade, ordem, insumos(nome), producoes:producao_filha_id(nome)").eq("producao_id", id).order("ordem"),
    supabase.from("producao_custos").select("id, custo_por_unidade, custo_batelada, custo_altec_por_unidade, origem, vigencia_inicio, vigencia_fim").eq("producao_id", id).order("vigencia_inicio", { ascending: false }),
  ]);
  if (!producao.data) return null;
  return {
    producao: producao.data as Record<string, unknown>,
    itens: (itens.data ?? []).map((i) => {
      const ins = i.insumos as unknown as { nome: string } | { nome: string }[] | null;
      const pr = i.producoes as unknown as { nome: string } | { nome: string }[] | null;
      return { id: i.id as string, nome: (Array.isArray(ins) ? ins[0]?.nome : ins?.nome) ?? (Array.isArray(pr) ? pr[0]?.nome : pr?.nome) ?? "", quantidade: n(i.quantidade) ?? 0, unidade: i.unidade as string };
    }),
    custos: (custos.data ?? []).map((c) => ({ id: c.id as string, custo: n(c.custo_por_unidade), batelada: n(c.custo_batelada), altec: n(c.custo_altec_por_unidade), origem: c.origem as string, inicio: c.vigencia_inicio as string, fim: (c.vigencia_fim as string | null) ?? null })),
  };
}

export interface ItemFichaCusteado {
  itemId: string;
  tipo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  quantidadeBase: number | null;
  precoOuCusto: number | null;
  rendimento: number | null;
  custo: number | null;
  custoAltec: number | null;
  distorcao: number | null;
  falta: string | null;
}

export async function fichaDetalhe(produtoId: string, data: string) {
  const { supabase, sessao } = await bd();
  const [produto, versoes] = await Promise.all([
    supabase.from("produtos").select("id, nome, bloco, secoes(nome)").eq("id", produtoId).eq("unidade_id", sessao.unidadeId).maybeSingle(),
    supabase.from("fichas").select("id, versao, vigencia_inicio, vigencia_fim, motivo, foto_url, fechada, criado_em").eq("produto_id", produtoId).order("versao", { ascending: false }),
  ]);
  if (!produto.data) return null;
  const s = produto.data.secoes as unknown as { nome: string } | { nome: string }[] | null;
  const lista = [];
  for (const v of versoes.data ?? []) {
    const { data: itens } = await supabase.rpc("f_custo_ficha_itens", { p_ficha: v.id, p_data: v.vigencia_fim ? (v.vigencia_fim as string) : data });
    const linhas: ItemFichaCusteado[] = (itens ?? []).map((i: Record<string, unknown>) => ({ itemId: String(i.item_id), tipo: String(i.tipo), nome: String(i.nome), quantidade: n(i.quantidade) ?? 0, unidade: String(i.unidade), quantidadeBase: n(i.quantidade_base), precoOuCusto: n(i.preco_ou_custo), rendimento: n(i.rendimento), custo: n(i.custo), custoAltec: n(i.custo_altec), distorcao: n(i.distorcao), falta: (i.falta as string | null) ?? null }));
    const completa = linhas.every((l) => l.custo !== null);
    lista.push({ id: v.id as string, versao: v.versao as number, inicio: v.vigencia_inicio as string, fim: (v.vigencia_fim as string | null) ?? null, motivo: v.motivo as string, fotoUrl: (v.foto_url as string | null) ?? null, itens: linhas, custo: completa ? linhas.reduce((t, l) => t + (l.custo ?? 0), 0) : null, custoAltec: completa ? linhas.reduce((t, l) => t + (l.custoAltec ?? 0), 0) : null });
  }
  const { data: preco } = await supabase.rpc("f_preco_venda", { p_produto: produtoId, p_data: data });
  return { produto: { id: produto.data.id as string, nome: produto.data.nome as string, bloco: produto.data.bloco as string, secao: (Array.isArray(s) ? s[0]?.nome : s?.nome) ?? null }, preco: n(preco), versoes: lista };
}

export async function produtosComPreco() {
  const { supabase, sessao } = await bd();
  const [produtos, precos] = await Promise.all([
    supabase.from("produtos").select("id, nome, id_altec, nome_altec, bloco, ativo, sazonal, secoes(nome, piso, teto)").eq("unidade_id", sessao.unidadeId).order("bloco").order("nome"),
    supabase.from("produto_precos").select("produto_id, preco, vigencia_inicio").eq("unidade_id", sessao.unidadeId).is("vigencia_fim", null),
  ]);
  const preco = new Map((precos.data ?? []).map((p) => [p.produto_id as string, p]));
  return (produtos.data ?? []).map((p) => {
    const s = p.secoes as unknown as { nome: string; piso: number | null; teto: number | null } | { nome: string; piso: number | null; teto: number | null }[] | null;
    const secao = Array.isArray(s) ? s[0] : s;
    const pr = preco.get(p.id as string);
    return { id: p.id as string, nome: p.nome as string, idAltec: (p.id_altec as string | null) ?? null, nomeAltec: (p.nome_altec as string | null) ?? null, bloco: p.bloco as string, ativo: Boolean(p.ativo), sazonal: Boolean(p.sazonal), secao: secao?.nome ?? null, piso: n(secao?.piso), teto: n(secao?.teto), preco: pr ? n(pr.preco) : null, desde: pr ? (pr.vigencia_inicio as string) : null };
  });
}

export async function produtoDetalhe(id: string) {
  const { supabase, sessao } = await bd();
  const [produto, precos, secoes] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", id).eq("unidade_id", sessao.unidadeId).maybeSingle(),
    supabase.from("produto_precos").select("id, preco, vigencia_inicio, vigencia_fim").eq("produto_id", id).order("vigencia_inicio", { ascending: false }),
    supabase.from("secoes").select("id, nome, bloco").eq("unidade_id", sessao.unidadeId).order("ordem"),
  ]);
  if (!produto.data) return null;
  return { produto: produto.data as Record<string, unknown>, precos: (precos.data ?? []).map((p) => ({ id: p.id as string, preco: n(p.preco) ?? 0, inicio: p.vigencia_inicio as string, fim: (p.vigencia_fim as string | null) ?? null })), secoes: (secoes.data ?? []).map((s) => ({ id: s.id as string, nome: s.nome as string, bloco: s.bloco as string })) };
}

export async function listarSecoes() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("secoes").select("id, nome, bloco, piso, teto").eq("unidade_id", sessao.unidadeId).order("ordem");
  return (data ?? []).map((s) => ({ id: s.id as string, nome: s.nome as string, bloco: s.bloco as string, piso: n(s.piso), teto: n(s.teto) }));
}

export async function listarMetas() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("metas_cmv").select("id, bloco, meta_pct, teto_pct, observacao, vigencia_inicio, vigencia_fim").eq("unidade_id", sessao.unidadeId).order("bloco").order("vigencia_inicio", { ascending: false });
  return (data ?? []).map((m) => ({ id: m.id as string, bloco: m.bloco as string, meta: n(m.meta_pct) ?? 0, teto: n(m.teto_pct), observacao: (m.observacao as string | null) ?? null, inicio: m.vigencia_inicio as string, fim: (m.vigencia_fim as string | null) ?? null }));
}

export async function listarCombos() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("combos_2x1").select("id, ativo, gratuito:produto_gratuito_id(nome), pago:produto_pago_id(nome)").eq("unidade_id", sessao.unidadeId);
  return (data ?? []).map((c) => {
    const g = c.gratuito as unknown as { nome: string } | { nome: string }[] | null;
    const p = c.pago as unknown as { nome: string } | { nome: string }[] | null;
    return { id: c.id as string, ativo: Boolean(c.ativo), gratuito: (Array.isArray(g) ? g[0]?.nome : g?.nome) ?? "", pago: (Array.isArray(p) ? p[0]?.nome : p?.nome) ?? "" };
  });
}

export async function listarOrcamento(competencia: string) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("orcamentos").select("id, linha_dre, valor, conta_id").eq("unidade_id", sessao.unidadeId).eq("competencia", competencia);
  return (data ?? []).map((o) => ({ id: o.id as string, linha: (o.linha_dre as string | null) ?? null, valor: n(o.valor) ?? 0, contaId: (o.conta_id as string | null) ?? null }));
}

export async function escalasDaSemana(inicio: string, fim: string) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("escalas").select("id, data, entrada, saida, realizado_entrada, realizado_saida, falta_nao_programada, colaboradores(nome, cargo)").eq("unidade_id", sessao.unidadeId).gte("data", inicio).lte("data", fim).order("data").order("entrada");
  return (data ?? []).map((e) => {
    const c = e.colaboradores as unknown as { nome: string; cargo: string } | { nome: string; cargo: string }[] | null;
    const col = Array.isArray(c) ? c[0] : c;
    return { id: e.id as string, data: e.data as string, entrada: e.entrada as string, saida: e.saida as string, realizadoEntrada: (e.realizado_entrada as string | null) ?? null, realizadoSaida: (e.realizado_saida as string | null) ?? null, falta: Boolean(e.falta_nao_programada), nome: col?.nome ?? "", cargo: col?.cargo ?? "" };
  });
}

export async function listarCertificacoes() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("certificacoes").select("id, nivel, data, colaboradores:colaborador_id(nome), processos_criticos(nome), avaliador:avaliador_id(nome)").eq("unidade_id", sessao.unidadeId).order("data", { ascending: false }).limit(50);
  const nome = (x: unknown) => {
    const v = x as { nome: string } | { nome: string }[] | null;
    return (Array.isArray(v) ? v[0]?.nome : v?.nome) ?? "";
  };
  return (data ?? []).map((c) => ({ id: c.id as string, nivel: n(c.nivel) ?? 0, data: c.data as string, colaborador: nome(c.colaboradores), processo: nome(c.processos_criticos), avaliador: nome(c.avaliador) }));
}

export async function canaisComParametros() {
  const { supabase, sessao } = await bd();
  const [canais, params] = await Promise.all([
    supabase.from("canais").select("id, nome, tipo, entrega_por, ativo, ordem").eq("unidade_id", sessao.unidadeId).order("ordem"),
    supabase.from("canal_parametros").select("canal_id, comissao_pct, taxa_pagamento_pct, embalagem, entrega, mensalidade, vigencia_inicio").eq("unidade_id", sessao.unidadeId).is("vigencia_fim", null),
  ]);
  const p = new Map((params.data ?? []).map((x) => [x.canal_id as string, x]));
  return (canais.data ?? []).map((c) => {
    const x = p.get(c.id as string);
    return { id: c.id as string, nome: c.nome as string, tipo: c.tipo as string, entregaPor: c.entrega_por as string, ativo: Boolean(c.ativo), comissao: x ? n(x.comissao_pct) : null, taxa: x ? n(x.taxa_pagamento_pct) : null, embalagem: x ? n(x.embalagem) : null, entrega: x ? n(x.entrega) : null, mensalidade: x ? n(x.mensalidade) : null, desde: x ? (x.vigencia_inicio as string) : null };
  });
}

export async function listarUsuarios() {
  const { supabase, sessao } = await bd();
  const [autorizados, perfis] = await Promise.all([
    supabase.from("usuarios_autorizados").select("id, email, nome, perfil, criado_em").eq("unidade_id", sessao.unidadeId).order("criado_em"),
    supabase.from("perfis").select("email, perfil, ativo, criado_em").eq("unidade_id", sessao.unidadeId),
  ]);
  const ativos = new Map((perfis.data ?? []).map((p) => [String(p.email).toLowerCase(), p]));
  return (autorizados.data ?? []).map((a) => ({ id: a.id as string, email: a.email as string, nome: (a.nome as string | null) ?? null, perfil: a.perfil as string, entrou: ativos.has(String(a.email).toLowerCase()) }));
}

export async function cronogramaModelo() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("cronograma_modelo").select("id, etapa, praca, hora_inicio, hora_fim, dias_semana, ordem, ativo").eq("unidade_id", sessao.unidadeId).order("ordem");
  return (data ?? []).map((m) => ({ id: m.id as string, etapa: m.etapa as string, praca: (m.praca as string | null) ?? null, inicio: String(m.hora_inicio).slice(0, 5), fim: String(m.hora_fim).slice(0, 5), dias: (m.dias_semana as number[]) ?? [], ordem: n(m.ordem) ?? 0, ativo: Boolean(m.ativo) }));
}

export async function caixaCompleto() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("caixa_projecao").select("id, semana_inicio, entradas_previstas, saidas_previstas, saldo_inicial, saldo_projetado, observacao").eq("unidade_id", sessao.unidadeId).order("semana_inicio", { ascending: false }).limit(26);
  return (data ?? []).map((l) => ({ id: l.id as string, semana: l.semana_inicio as string, entradas: n(l.entradas_previstas) ?? 0, saidas: n(l.saidas_previstas) ?? 0, saldoInicial: n(l.saldo_inicial), saldoProjetado: n(l.saldo_projetado), observacao: (l.observacao as string | null) ?? null }));
}
