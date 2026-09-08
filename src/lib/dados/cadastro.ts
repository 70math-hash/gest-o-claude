import { bd, numero } from "./base";

export interface ProdutoResumo {
  id: string;
  nome: string;
  bloco: string;
  secao: string | null;
  id_altec: string | null;
  nome_altec: string | null;
  ativo: boolean;
  sazonal: boolean;
}

export async function listarProdutosAtivos(): Promise<ProdutoResumo[]> {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("produtos").select("id, nome, bloco, id_altec, nome_altec, ativo, sazonal, secoes(nome)").eq("unidade_id", sessao.unidadeId).eq("ativo", true).order("bloco").order("nome");
  return (data ?? []).map((p) => {
    const s = p.secoes as unknown as { nome: string } | { nome: string }[] | null;
    return { id: p.id as string, nome: p.nome as string, bloco: p.bloco as string, secao: Array.isArray(s) ? (s[0]?.nome ?? null) : (s?.nome ?? null), id_altec: (p.id_altec as string | null) ?? null, nome_altec: (p.nome_altec as string | null) ?? null, ativo: Boolean(p.ativo), sazonal: Boolean(p.sazonal) };
  });
}

export async function listarProducoes() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("producoes").select("id, codigo_altec, nome, base, unidade_rendimento, rendimento_declarado, rendimento_uso_pct, ativo, observacao").eq("unidade_id", sessao.unidadeId).order("nome");
  return (data ?? []).map((p) => ({ id: p.id as string, codigoAltec: (p.codigo_altec as string | null) ?? null, nome: p.nome as string, base: p.base as string, unidadeRendimento: p.unidade_rendimento as string, rendimentoDeclarado: numero(p.rendimento_declarado), rendimentoUso: numero(p.rendimento_uso_pct) ?? 1, ativo: Boolean(p.ativo), observacao: (p.observacao as string | null) ?? null }));
}

export async function listarInsumos() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("insumos").select("id, nome, categoria, base, unidade_uso, curva_abc, ativo, codigo_altec").eq("unidade_id", sessao.unidadeId).order("nome");
  return (data ?? []).map((i) => ({ id: i.id as string, nome: i.nome as string, categoria: (i.categoria as string | null) ?? null, base: i.base as string, unidadeUso: i.unidade_uso as string, curva: (i.curva_abc as string | null) ?? null, ativo: Boolean(i.ativo), codigoAltec: (i.codigo_altec as string | null) ?? null }));
}

export async function listarColaboradores(apenasAtivos = true) {
  const { supabase, sessao } = await bd();
  let consulta = supabase.from("colaboradores").select("id, nome, cargo, praca, codigo_altec, admissao, desligamento, salario_base, ativo").eq("unidade_id", sessao.unidadeId).order("nome");
  if (apenasAtivos) consulta = consulta.is("desligamento", null);
  const { data } = await consulta;
  return (data ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string, cargo: c.cargo as string, praca: (c.praca as string | null) ?? null, codigoAltec: (c.codigo_altec as string | null) ?? null, admissao: c.admissao as string, desligamento: (c.desligamento as string | null) ?? null, salarioBase: numero(c.salario_base), ativo: Boolean(c.ativo) }));
}

export async function listarFornecedores() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("fornecedores").select("id, nome, cnpj, contato, prazo_entrega_dias, homologado, ativo").eq("unidade_id", sessao.unidadeId).order("nome");
  return (data ?? []).map((f) => ({ id: f.id as string, nome: f.nome as string, cnpj: (f.cnpj as string | null) ?? null, contato: (f.contato as string | null) ?? null, prazo: numero(f.prazo_entrega_dias) ?? 0, homologado: Boolean(f.homologado), ativo: Boolean(f.ativo) }));
}

export async function listarPlanoContas() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("plano_contas").select("id, codigo, grupo, nome, natureza, dono, linha_dre, ativo, ordem").eq("unidade_id", sessao.unidadeId).order("ordem");
  return (data ?? []).map((c) => ({ id: c.id as string, codigo: (c.codigo as string | null) ?? null, grupo: c.grupo as string, nome: c.nome as string, natureza: c.natureza as string, dono: c.dono as string, linhaDre: (c.linha_dre as string | null) ?? null, ativo: Boolean(c.ativo), ordem: numero(c.ordem) ?? 0 }));
}

export async function listarProcessos() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("processos_criticos").select("id, nome, praca, pop_url, pop_versao, pop_testado_em, ativo").eq("unidade_id", sessao.unidadeId).order("nome");
  return (data ?? []).map((p) => ({ id: p.id as string, nome: p.nome as string, praca: (p.praca as string | null) ?? null, popUrl: (p.pop_url as string | null) ?? null, popVersao: (p.pop_versao as string | null) ?? null, popTestadoEm: (p.pop_testado_em as string | null) ?? null, ativo: Boolean(p.ativo) }));
}
