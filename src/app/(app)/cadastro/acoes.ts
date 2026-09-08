"use server";
/**
 * Ações de cadastro. Toda gravação passa pela RLS do perfil; tabelas
 * temporais (preços, metas, canais, fichas) só ganham vigência nova.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, marcado, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";
import { hojeIso } from "@/formato";

function fracao(form: FormData, nome: string): number | null {
  const v = numeroForm(form, nome);
  if (v === null) return null;
  return v > 1 ? v / 100 : v;
}

export async function salvarInsumo(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const unidade = texto(form, "unidade_uso");
  const preco = numeroForm(form, "preco");
  const rendimento = fracao(form, "rendimento");
  if (!nome || !unidade) return erro("Informe nome e unidade de uso.");
  if (preco === null || rendimento === null) return erro("Cadastro sem preço e rendimento não salva (regra 3).");
  if (rendimento <= 0 || rendimento > 1) return erro("Rendimento precisa estar entre 1% e 100%.");
  const { supabase, sessao } = await bd();
  const { data: insumo, error } = await supabase.from("insumos").insert({ unidade_id: sessao.unidadeId, nome, categoria: texto(form, "categoria"), base: texto(form, "base") ?? "cozinha", unidade_uso: unidade, unidade_compra: texto(form, "unidade_compra") ?? unidade, curva_abc: texto(form, "curva_abc"), codigo_altec: texto(form, "codigo_altec") }).select("id").single();
  if (error || !insumo) return erro(error?.message ?? "Falha ao salvar.");
  const { error: e2 } = await supabase.from("insumo_precos").insert({ unidade_id: sessao.unidadeId, insumo_id: insumo.id, preco_por_unidade: preco, rendimento_pct: rendimento, vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso(), origem: texto(form, "origem") ?? "manual" });
  if (e2) return erro(e2.message);
  revalidatePath("/cadastro/insumos");
  return ok(`Insumo ${nome} cadastrado com preço vigente.`);
}

export async function novoPrecoInsumo(_a: Resultado, form: FormData): Promise<Resultado> {
  const insumoId = texto(form, "insumo_id");
  const preco = numeroForm(form, "preco");
  const rendimento = fracao(form, "rendimento");
  if (!insumoId || preco === null || rendimento === null) return erro("Informe preço e rendimento.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("insumo_precos").insert({ unidade_id: sessao.unidadeId, insumo_id: insumoId, preco_por_unidade: preco, rendimento_pct: rendimento, vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso(), origem: texto(form, "origem") ?? "cotacao" });
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/insumos/${insumoId}`);
  revalidatePath("/cadastro/insumos");
  return ok("Nova vigência de preço gravada; a anterior foi fechada, não sobrescrita.");
}

export async function atualizarInsumo(_a: Resultado, form: FormData): Promise<Resultado> {
  const id = texto(form, "id");
  if (!id) return erro("Insumo inválido.");
  const { supabase } = await bd();
  const { error } = await supabase.from("insumos").update({ categoria: texto(form, "categoria"), base: texto(form, "base") ?? "cozinha", curva_abc: texto(form, "curva_abc"), codigo_altec: texto(form, "codigo_altec"), ativo: marcado(form, "ativo"), fator_compra_para_uso: numeroForm(form, "fator_compra_para_uso") ?? 1 }).eq("id", id);
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/insumos/${id}`);
  return ok("Insumo atualizado.");
}

export async function vincularFornecedor(insumoId: string, fornecedorId: string, vincular: boolean): Promise<void> {
  const { supabase, sessao } = await bd();
  if (vincular) await supabase.from("insumo_fornecedores").insert({ unidade_id: sessao.unidadeId, insumo_id: insumoId, fornecedor_id: fornecedorId });
  else await supabase.from("insumo_fornecedores").delete().eq("insumo_id", insumoId).eq("fornecedor_id", fornecedorId);
  revalidatePath(`/cadastro/insumos/${insumoId}`);
}

export async function salvarProducao(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const unidade = texto(form, "unidade_rendimento") ?? "kg";
  const rendimento = numeroForm(form, "rendimento_declarado");
  if (!nome) return erro("Informe o nome.");
  if (rendimento === null || rendimento <= 0) return erro("Produção intermediária sem rendimento declarado: cadastro bloqueado (seção 8).");
  const { supabase, sessao } = await bd();
  const { data: producao, error } = await supabase.from("producoes").insert({ unidade_id: sessao.unidadeId, nome, codigo_altec: texto(form, "codigo_altec"), base: texto(form, "base") ?? "cozinha", unidade_rendimento: unidade, rendimento_declarado: rendimento, rendimento_uso_pct: fracao(form, "rendimento_uso") ?? 1 }).select("id").single();
  if (error || !producao) return erro(error?.message ?? "Falha ao salvar.");
  const custo = numeroForm(form, "custo_por_unidade");
  if (custo !== null) await supabase.from("producao_custos").insert({ unidade_id: sessao.unidadeId, producao_id: producao.id, custo_por_unidade: custo, origem: "manual", vigencia_inicio: hojeIso() });
  revalidatePath("/cadastro/producoes");
  return ok(`Produção ${nome} cadastrada.`);
}

export async function atualizarProducao(_a: Resultado, form: FormData): Promise<Resultado> {
  const id = texto(form, "id");
  const rendimento = numeroForm(form, "rendimento_declarado");
  if (!id) return erro("Produção inválida.");
  const { supabase } = await bd();
  const { error } = await supabase.from("producoes").update({ rendimento_declarado: rendimento, rendimento_uso_pct: fracao(form, "rendimento_uso") ?? 1, ativo: marcado(form, "ativo"), observacao: texto(form, "observacao"), codigo_altec: texto(form, "codigo_altec") }).eq("id", id);
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/producoes/${id}`);
  revalidatePath("/cadastro/producoes");
  return ok("Produção atualizada.");
}

export async function adicionarItemBatelada(_a: Resultado, form: FormData): Promise<Resultado> {
  const producaoId = texto(form, "producao_id");
  const componente = texto(form, "componente");
  const quantidade = numeroForm(form, "quantidade");
  const unidade = texto(form, "unidade");
  if (!producaoId || !componente || !quantidade || !unidade) return erro("Informe componente, quantidade e unidade.");
  const [tipo, id] = componente.split(":");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("producao_itens").insert({ unidade_id: sessao.unidadeId, producao_id: producaoId, insumo_id: tipo === "insumo" ? id : null, producao_filha_id: tipo === "producao" ? id : null, quantidade, unidade });
  if (error) return erro(error.message.includes("rendimento") ? "Produção sem rendimento declarado: informe o rendimento antes de cadastrar a batelada." : error.message);
  revalidatePath(`/cadastro/producoes/${producaoId}`);
  return ok("Item da batelada adicionado.");
}

export async function removerItemBatelada(id: string, producaoId: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("producao_itens").delete().eq("id", id);
  revalidatePath(`/cadastro/producoes/${producaoId}`);
}

export async function recalcularCustoProducao(producaoId: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.rpc("f_recalcular_custo_producao", { p_producao: producaoId, p_data: hojeIso() });
  revalidatePath(`/cadastro/producoes/${producaoId}`);
  revalidatePath("/cadastro/producoes");
}

export async function novoCustoProducao(_a: Resultado, form: FormData): Promise<Resultado> {
  const producaoId = texto(form, "producao_id");
  const custo = numeroForm(form, "custo_por_unidade");
  if (!producaoId || custo === null) return erro("Informe o custo.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("producao_custos").insert({ unidade_id: sessao.unidadeId, producao_id: producaoId, custo_por_unidade: custo, origem: texto(form, "origem") ?? "manual", vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso() });
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/producoes/${producaoId}`);
  return ok("Custo com nova vigência gravado.");
}

export async function novaVersaoFicha(_a: Resultado, form: FormData): Promise<Resultado> {
  const produtoId = texto(form, "produto_id");
  const motivo = texto(form, "motivo");
  if (!produtoId) return erro("Produto inválido.");
  if (!motivo) return erro("Ficha alterada sem motivo e sem versão nova: bloqueado. Informe o motivo.");
  const itens: Array<{ insumo_id: string | null; producao_id: string | null; quantidade: number; unidade: string }> = [];
  for (let i = 0; i < 40; i++) {
    const componente = texto(form, `componente:${i}`);
    if (!componente) continue;
    const quantidade = numeroForm(form, `quantidade:${i}`);
    const unidade = texto(form, `unidade:${i}`);
    if (!quantidade || quantidade <= 0 || !unidade) return erro(`Linha ${i + 1}: quantidade e unidade.`);
    const kg = unidade === "g" ? quantidade / 1000 : unidade === "kg" ? quantidade : null;
    if (kg !== null && (kg > 1 || kg < 0.0005) && !marcado(form, "confirmar_gramagem")) return erro(`Linha ${i + 1}: gramagem por porção acima de 1 kg ou abaixo de 0,5 g, provável erro de vírgula. Marque "confirmo as gramagens" para salvar assim mesmo.`);
    const [tipo, id] = componente.split(":");
    itens.push({ insumo_id: tipo === "insumo" ? (id ?? null) : null, producao_id: tipo === "producao" ? (id ?? null) : null, quantidade, unidade });
  }
  if (itens.length === 0) return erro("Ficha sem itens.");
  const { supabase } = await bd();
  const { error } = await supabase.rpc("f_nova_versao_ficha", { p_produto: produtoId, p_motivo: motivo, p_itens: itens, p_vigencia: dataForm(form, "vigencia_inicio") ?? hojeIso(), p_foto_url: texto(form, "foto_url") });
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/fichas/${produtoId}`);
  revalidatePath("/cadastro/fichas");
  return ok("Nova versão da ficha gravada; a anterior foi encerrada e continua no histórico.");
}

export async function salvarProduto(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const bloco = texto(form, "bloco");
  const preco = numeroForm(form, "preco");
  if (!nome || !bloco) return erro("Informe nome e bloco.");
  const { supabase, sessao } = await bd();
  const { data: produto, error } = await supabase.from("produtos").insert({ unidade_id: sessao.unidadeId, nome, bloco, id_altec: texto(form, "id_altec"), nome_altec: texto(form, "nome_altec"), secao_id: texto(form, "secao_id"), sazonal: marcado(form, "sazonal") }).select("id").single();
  if (error || !produto) return erro(error?.message ?? "Falha ao salvar.");
  if (preco !== null) await supabase.from("produto_precos").insert({ unidade_id: sessao.unidadeId, produto_id: produto.id, preco, vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso() });
  revalidatePath("/cadastro/produtos");
  return ok(`Produto ${nome} cadastrado.`);
}

export async function atualizarProduto(_a: Resultado, form: FormData): Promise<Resultado> {
  const id = texto(form, "id");
  if (!id) return erro("Produto inválido.");
  const { supabase } = await bd();
  const { error } = await supabase.from("produtos").update({ nome: texto(form, "nome"), id_altec: texto(form, "id_altec"), nome_altec: texto(form, "nome_altec"), secao_id: texto(form, "secao_id"), ativo: marcado(form, "ativo"), sazonal: marcado(form, "sazonal") }).eq("id", id);
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/produtos/${id}`);
  revalidatePath("/cadastro/produtos");
  return ok("Produto atualizado.");
}

export async function novoPrecoProduto(_a: Resultado, form: FormData): Promise<Resultado> {
  const produtoId = texto(form, "produto_id");
  const preco = numeroForm(form, "preco");
  if (!produtoId || preco === null) return erro("Informe o preço.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("produto_precos").insert({ unidade_id: sessao.unidadeId, produto_id: produtoId, preco, vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso() });
  if (error) return erro(error.message);
  revalidatePath(`/cadastro/produtos/${produtoId}`);
  revalidatePath("/cadastro/produtos");
  return ok("Novo preço com vigência gravado.");
}

export async function salvarMeta(_a: Resultado, form: FormData): Promise<Resultado> {
  const bloco = texto(form, "bloco");
  const meta = fracao(form, "meta");
  const teto = fracao(form, "teto");
  if (!bloco || meta === null) return erro("Informe bloco e meta.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("metas_cmv").insert({ unidade_id: sessao.unidadeId, bloco, meta_pct: meta, teto_pct: teto, observacao: texto(form, "observacao"), vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso() });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/metas");
  return ok("Meta com nova vigência gravada. Meta é teto, não alvo.");
}

export async function salvarCombo(_a: Resultado, form: FormData): Promise<Resultado> {
  const gratuito = texto(form, "produto_gratuito_id");
  const pago = texto(form, "produto_pago_id");
  if (!gratuito || !pago) return erro("Escolha a gratuita e a paga.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("combos_2x1").insert({ unidade_id: sessao.unidadeId, produto_gratuito_id: gratuito, produto_pago_id: pago });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/combos");
  return ok("Combo cadastrado.");
}

export async function alternarCombo(id: string, ativo: boolean): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("combos_2x1").update({ ativo }).eq("id", id);
  revalidatePath("/cadastro/combos");
}

export async function salvarConta(_a: Resultado, form: FormData): Promise<Resultado> {
  const grupo = texto(form, "grupo");
  const nome = texto(form, "nome");
  const natureza = texto(form, "natureza");
  if (!grupo || !nome || !natureza) return erro("Informe grupo, nome e natureza.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("plano_contas").insert({ unidade_id: sessao.unidadeId, grupo, nome, natureza, dono: texto(form, "dono") ?? "gestor", linha_dre: texto(form, "linha_dre") ?? "outros", codigo: texto(form, "codigo"), ordem: numeroForm(form, "ordem") ?? 99 });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/plano-contas");
  return ok("Conta cadastrada.");
}

export async function salvarOrcamento(_a: Resultado, form: FormData): Promise<Resultado> {
  const competencia = texto(form, "competencia");
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return erro("Competência inválida.");
  const { supabase, sessao } = await bd();
  const linhas = ["receita_bruta", "impostos", "taxas_pagamento", "comissoes_marketplace", "cmv", "embalagem", "folha", "ocupacao", "utilidades", "operacional", "marketing", "financeiro", "lucro_alvo"];
  await supabase.from("orcamentos").delete().eq("unidade_id", sessao.unidadeId).eq("competencia", `${competencia}-01`).not("linha_dre", "is", null);
  const registros = linhas.map((l) => ({ unidade_id: sessao.unidadeId, competencia: `${competencia}-01`, linha_dre: l, valor: numeroForm(form, l) })).filter((r) => r.valor !== null);
  if (registros.length > 0) {
    const { error } = await supabase.from("orcamentos").insert(registros);
    if (error) return erro(error.message);
  }
  revalidatePath("/cadastro/orcamento");
  revalidatePath("/leitura/mes");
  return ok("Orçamento salvo.");
}

export async function salvarColaborador(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const cargo = texto(form, "cargo");
  const admissao = dataForm(form, "admissao");
  if (!nome || !cargo || !admissao) return erro("Informe nome, cargo e admissão.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("colaboradores").insert({ unidade_id: sessao.unidadeId, nome, cargo, praca: texto(form, "praca"), codigo_altec: texto(form, "codigo_altec"), admissao, salario_base: numeroForm(form, "salario_base") });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/colaboradores");
  return ok("Colaborador cadastrado.");
}

export async function desligarColaborador(id: string, data: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("colaboradores").update({ desligamento: data }).eq("id", id);
  revalidatePath("/cadastro/colaboradores");
}

export async function salvarFolha(_a: Resultado, form: FormData): Promise<Resultado> {
  const competencia = texto(form, "competencia");
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return erro("Competência inválida.");
  const { supabase, sessao } = await bd();
  const registros: Array<Record<string, unknown>> = [];
  for (const nome of form.keys()) {
    const m = /^salario:(.+)$/.exec(nome);
    if (!m) continue;
    const id = m[1]!;
    const salario = numeroForm(form, `salario:${id}`);
    if (salario === null) continue;
    registros.push({ unidade_id: sessao.unidadeId, competencia: `${competencia}-01`, colaborador_id: id, salario, encargos: numeroForm(form, `encargos:${id}`) ?? 0, beneficios: numeroForm(form, `beneficios:${id}`) ?? 0, horas_extras_valor: numeroForm(form, `extras:${id}`) ?? 0 });
  }
  if (registros.length === 0) return erro("Nenhum salário informado.");
  const { error } = await supabase.from("folha_mensal").upsert(registros, { onConflict: "colaborador_id,competencia" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/colaboradores");
  return ok(`Folha de ${registros.length} colaborador(es) salva.`);
}

export async function salvarEscala(_a: Resultado, form: FormData): Promise<Resultado> {
  const colaborador = texto(form, "colaborador_id");
  const data = dataForm(form, "data");
  const entrada = texto(form, "entrada");
  const saida = texto(form, "saida");
  if (!colaborador || !data || !entrada || !saida) return erro("Informe colaborador, data, entrada e saída.");
  const { supabase, sessao } = await bd();
  const fimDia = (saida < entrada) ? new Date(`${data}T12:00:00Z`) : null;
  if (fimDia) fimDia.setUTCDate(fimDia.getUTCDate() + 1);
  const { error } = await supabase.from("escalas").upsert({ unidade_id: sessao.unidadeId, colaborador_id: colaborador, data, entrada: `${data}T${entrada}:00-03:00`, saida: `${fimDia ? fimDia.toISOString().slice(0, 10) : data}T${saida}:00-03:00` }, { onConflict: "colaborador_id,data" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/escalas");
  return ok("Escala salva.");
}

export async function salvarRealizado(_a: Resultado, form: FormData): Promise<Resultado> {
  const id = texto(form, "id");
  const data = dataForm(form, "data");
  if (!id || !data) return erro("Escala inválida.");
  const entrada = texto(form, "realizado_entrada");
  const saida = texto(form, "realizado_saida");
  const falta = marcado(form, "falta");
  const { supabase } = await bd();
  const fimDia = saida && entrada && saida < entrada ? new Date(`${data}T12:00:00Z`) : null;
  if (fimDia) fimDia.setUTCDate(fimDia.getUTCDate() + 1);
  const { error } = await supabase.from("escalas").update({ realizado_entrada: entrada ? `${data}T${entrada}:00-03:00` : null, realizado_saida: saida ? `${fimDia ? fimDia.toISOString().slice(0, 10) : data}T${saida}:00-03:00` : null, falta_nao_programada: falta }).eq("id", id);
  if (error) return erro(error.message);
  revalidatePath("/cadastro/escalas");
  return ok("Realizado salvo.");
}

export async function salvarCertificacao(_a: Resultado, form: FormData): Promise<Resultado> {
  const colaborador = texto(form, "colaborador_id");
  const processo = texto(form, "processo_id");
  const nivel = numeroForm(form, "nivel");
  const data = dataForm(form, "data");
  if (!colaborador || !processo || !nivel || !data) return erro("Informe colaborador, processo, nível e data.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("certificacoes").insert({ unidade_id: sessao.unidadeId, colaborador_id: colaborador, processo_id: processo, nivel, data, avaliador_id: texto(form, "avaliador_id") });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/certificacoes");
  return ok("Certificação lançada.");
}

export async function salvarProcesso(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  if (!nome) return erro("Informe o nome.");
  const { supabase, sessao } = await bd();
  const id = texto(form, "id");
  const registro = { nome, praca: texto(form, "praca"), pop_url: texto(form, "pop_url"), pop_versao: texto(form, "pop_versao"), pop_testado_em: dataForm(form, "pop_testado_em") };
  const { error } = id ? await supabase.from("processos_criticos").update(registro).eq("id", id) : await supabase.from("processos_criticos").insert({ unidade_id: sessao.unidadeId, ...registro });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/processos");
  return ok("Processo salvo.");
}

export async function salvarFornecedor(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  if (!nome) return erro("Informe o nome.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("fornecedores").insert({ unidade_id: sessao.unidadeId, nome, cnpj: texto(form, "cnpj"), contato: texto(form, "contato"), prazo_entrega_dias: numeroForm(form, "prazo_entrega_dias") ?? 1, homologado: marcado(form, "homologado") });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/fornecedores");
  return ok("Fornecedor cadastrado.");
}

export async function alternarHomologacao(id: string, homologado: boolean): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("fornecedores").update({ homologado }).eq("id", id);
  revalidatePath("/cadastro/fornecedores");
}

export async function salvarParametros(_a: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const dias = [0, 1, 2, 3, 4, 5, 6].filter((d) => marcado(form, `dia:${d}`));
  const registro = {
    unidade_id: sessao.unidadeId,
    cadeiras: numeroForm(form, "cadeiras"),
    mesas: numeroForm(form, "mesas"),
    horas_servico: numeroForm(form, "horas_servico"),
    dias_operacao: dias,
    taxa_servico_pct: fracao(form, "taxa_servico_pct") ?? 0.13,
    fator_seguranca_padrao: numeroForm(form, "fator_seguranca_padrao") ?? 1.1,
    alerta_documento_dias: numeroForm(form, "alerta_documento_dias") ?? 60,
    fator_popularidade: numeroForm(form, "fator_popularidade") ?? 0.7,
    cozinheiros_padrao: numeroForm(form, "cozinheiros_padrao") ?? 4,
    regime_tributario: texto(form, "regime_tributario") ?? "simples_nacional",
    simples_anexo: texto(form, "simples_anexo") ?? "I",
    rbt12_manual: numeroForm(form, "rbt12_manual"),
    imposto_pct: fracao(form, "imposto_pct"),
    taxa_pagamento_pct: fracao(form, "taxa_pagamento_pct"),
    forno_pizzas_hora: numeroForm(form, "forno_pizzas_hora"),
    forno_pico_15min: numeroForm(form, "forno_pico_15min"),
  };
  const { error } = await supabase.from("parametros").upsert(registro, { onConflict: "unidade_id" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/parametros");
  revalidatePath("/leitura/mes");
  return ok("Parâmetros salvos.");
}

export async function salvarCanal(_a: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const tipo = texto(form, "tipo");
  if (!nome || !tipo) return erro("Informe nome e tipo.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("canais").insert({ unidade_id: sessao.unidadeId, nome, tipo, entrega_por: texto(form, "entrega_por") ?? "plataforma", ordem: numeroForm(form, "ordem") ?? 99 });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/canais");
  return ok("Canal cadastrado. Informe os parâmetros com vigência.");
}

export async function novoParametroCanal(_a: Resultado, form: FormData): Promise<Resultado> {
  const canalId = texto(form, "canal_id");
  if (!canalId) return erro("Canal inválido.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("canal_parametros").insert({ unidade_id: sessao.unidadeId, canal_id: canalId, comissao_pct: fracao(form, "comissao"), taxa_pagamento_pct: fracao(form, "taxa_pagamento"), embalagem: numeroForm(form, "embalagem") ?? 0, entrega: numeroForm(form, "entrega") ?? 0, mensalidade: numeroForm(form, "mensalidade") ?? 0, vigencia_inicio: dataForm(form, "vigencia_inicio") ?? hojeIso() });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/canais");
  revalidatePath("/leitura/canais");
  return ok("Parâmetros do canal gravados com vigência.");
}

export async function autorizarUsuario(_a: Resultado, form: FormData): Promise<Resultado> {
  const email = texto(form, "email")?.toLowerCase();
  const perfil = texto(form, "perfil");
  if (!email || !perfil) return erro("Informe e-mail e perfil.");
  const { supabase, sessao } = await bd();
  if (sessao.perfil !== "dono") return erro("Só o dono autoriza usuários.");
  const { error } = await supabase.from("usuarios_autorizados").upsert({ unidade_id: sessao.unidadeId, email, nome: texto(form, "nome"), perfil }, { onConflict: "email" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/usuarios");
  return ok(`${email} autorizado como ${perfil}. O acesso abre no próximo login.`);
}

export async function removerAutorizacao(id: string): Promise<void> {
  const { supabase, sessao } = await bd();
  if (sessao.perfil !== "dono") return;
  const { data } = await supabase.from("usuarios_autorizados").select("email").eq("id", id).maybeSingle();
  await supabase.from("usuarios_autorizados").delete().eq("id", id);
  if (data?.email) await supabase.from("perfis").update({ ativo: false }).eq("email", data.email);
  revalidatePath("/cadastro/usuarios");
}

export async function salvarEtapaModelo(_a: Resultado, form: FormData): Promise<Resultado> {
  const etapa = texto(form, "etapa");
  const inicio = texto(form, "hora_inicio");
  const fim = texto(form, "hora_fim");
  if (!etapa || !inicio || !fim) return erro("Informe etapa, início e fim.");
  const { supabase, sessao } = await bd();
  const dias = [0, 1, 2, 3, 4, 5, 6].filter((d) => marcado(form, `dia:${d}`));
  const { error } = await supabase.from("cronograma_modelo").insert({ unidade_id: sessao.unidadeId, etapa, praca: texto(form, "praca"), hora_inicio: inicio, hora_fim: fim, dias_semana: dias.length ? dias : [0, 2, 3, 4, 5, 6], ordem: numeroForm(form, "ordem") ?? 99 });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/cronograma");
  return ok("Etapa do modelo salva.");
}

export async function removerEtapaModelo(id: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("cronograma_modelo").delete().eq("id", id);
  revalidatePath("/cadastro/cronograma");
}

export async function salvarChecklistModelo(_a: Resultado, form: FormData): Promise<Resultado> {
  const praca = texto(form, "praca");
  const tipo = texto(form, "tipo");
  const itens = (texto(form, "itens") ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!praca || !tipo || itens.length === 0) return erro("Informe praça, tipo e ao menos um item.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("checklist_modelo").upsert({ unidade_id: sessao.unidadeId, praca, tipo, itens }, { onConflict: "unidade_id,praca,tipo" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/checklists");
  return ok("Modelo de checklist salvo.");
}

export async function salvarCaixa(_a: Resultado, form: FormData): Promise<Resultado> {
  const semana = dataForm(form, "semana_inicio");
  if (!semana) return erro("Informe a semana.");
  const entradas = numeroForm(form, "entradas_previstas") ?? 0;
  const saidas = numeroForm(form, "saidas_previstas") ?? 0;
  const saldoInicial = numeroForm(form, "saldo_inicial");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("caixa_projecao").upsert({ unidade_id: sessao.unidadeId, semana_inicio: semana, entradas_previstas: entradas, saidas_previstas: saidas, saldo_inicial: saldoInicial, saldo_projetado: saldoInicial === null ? null : saldoInicial + entradas - saidas, observacao: texto(form, "observacao") }, { onConflict: "unidade_id,semana_inicio" });
  if (error) return erro(error.message);
  revalidatePath("/cadastro/caixa");
  revalidatePath("/leitura/mes");
  return ok("Semana da projeção salva.");
}

export async function irPara(caminho: string): Promise<void> {
  redirect(caminho);
}
