import { bd, numero } from "./base";

export async function importacoesRecentes(limite = 15) {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("importacoes").select("id, tipo, arquivo, periodo_inicio, periodo_fim, linhas, status, avisos, criado_em").eq("unidade_id", sessao.unidadeId).order("criado_em", { ascending: false }).limit(limite);
  return (data ?? []).map((i) => ({ id: i.id as string, tipo: i.tipo as string, arquivo: i.arquivo as string, inicio: (i.periodo_inicio as string | null) ?? null, fim: (i.periodo_fim as string | null) ?? null, linhas: numero(i.linhas) ?? 0, status: i.status as string, avisos: (i.avisos as string[]) ?? [], criadoEm: i.criado_em as string }));
}

export async function pendenciasAbertas() {
  const { supabase, sessao } = await bd();
  const { data } = await supabase.from("importacao_pendencias").select("id, tipo, id_altec, nome_altec, categoria_altec, qtde, total, bloco, criado_em, importacoes(arquivo)").eq("unidade_id", sessao.unidadeId).is("resolvido_em", null).order("criado_em", { ascending: false });
  return (data ?? []).map((p) => {
    const imp = p.importacoes as unknown as { arquivo: string } | { arquivo: string }[] | null;
    return { id: p.id as string, tipo: p.tipo as string, idAltec: (p.id_altec as string | null) ?? null, nomeAltec: (p.nome_altec as string | null) ?? null, categoriaAltec: (p.categoria_altec as string | null) ?? null, qtde: numero(p.qtde), total: numero(p.total), bloco: (p.bloco as string | null) ?? null, criadoEm: p.criado_em as string, arquivo: (Array.isArray(imp) ? imp[0]?.arquivo : imp?.arquivo) ?? "" };
  });
}
