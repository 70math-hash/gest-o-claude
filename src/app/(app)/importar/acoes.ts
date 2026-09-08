"use server";
/**
 * Importação de arquivos (seção 6). Lê com src/importadores (parsers
 * puros), grava nas tabelas de movimento e alimenta a fila de mapeamento.
 */
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, ok, texto, type Resultado } from "@/lib/acoes";
import { hashArquivo, lerAltecDia, lerAltecR3, lerCadastroInicial, lerComandas, lerExtratoSantander, lerTabela, mapearProdutos } from "@/importadores";
import { hojeIso } from "@/formato";

export async function importarArquivo(_a: Resultado, form: FormData): Promise<Resultado> {
  const tipo = texto(form, "tipo");
  const arquivo = form.get("arquivo");
  if (!tipo || !(arquivo instanceof File) || arquivo.size === 0) return erro("Escolha o tipo e o arquivo.");
  if (arquivo.size > 25 * 1024 * 1024) return erro("Arquivo acima de 25 MB.");
  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  const hash = await hashArquivo(conteudo);
  const { supabase, sessao } = await bd();
  const { data: existente } = await supabase.from("importacoes").select("id, criado_em").eq("unidade_id", sessao.unidadeId).eq("hash", hash).maybeSingle();
  if (existente) return erro("Arquivo já importado (mesmo hash): bloqueado.");
  let tabela;
  try {
    tabela = lerTabela({ nome: arquivo.name, conteudo });
  } catch (e) {
    return erro(`Não consegui ler o arquivo: ${(e as Error).message}`);
  }
  const dataInformada = dataForm(form, "data") ?? hojeIso();
  const dataFim = dataForm(form, "data_fim");
  try {
    switch (tipo) {
      case "altec_r3":
        return await importarR3(tabela, arquivo.name, hash, dataInformada, dataFim);
      case "altec_dia":
        return await importarDia(tabela, arquivo.name, hash, dataInformada);
      case "santander":
        return await importarSantander(tabela, arquivo.name, hash);
      case "comanda":
        return await importarComanda(tabela, arquivo.name, hash, dataInformada);
      case "cadastro":
        return await importarCadastro(tabela, arquivo.name, hash);
      default:
        return erro("Tipo desconhecido.");
    }
  } catch (e) {
    return erro(`Falha na importação: ${(e as Error).message}`);
  } finally {
    revalidatePath("/importar");
    revalidatePath("/hoje");
    revalidatePath("/leitura/semana");
  }
}

type Tabela = ReturnType<typeof lerTabela>;

async function importarR3(tabela: Tabela, nome: string, hash: string, dataInformada: string, dataFim: string | null): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const r3 = lerAltecR3(tabela);
  if (r3.linhas.length === 0) return erro(`Nenhuma linha de produto encontrada. Avisos: ${r3.avisos.join("; ") || "nenhum"}`);
  const inicio = r3.periodo?.inicio ?? dataInformada;
  const fim = r3.periodo?.fim ?? dataFim ?? inicio;
  const { data: produtos } = await supabase.from("produtos").select("id, id_altec, nome_altec, nome, bloco").eq("unidade_id", sessao.unidadeId);
  const catalogo = (produtos ?? []).map((p) => ({ produtoId: p.id as string, idAltec: (p.id_altec as string | null) ?? null, nomeAltec: (p.nome_altec as string | null) ?? (p.nome as string), nome: p.nome as string, bloco: p.bloco as "pizza" | "entrada" | "sobremesa" | "bar" | "salao" }));
  const mapeamento = mapearProdutos(r3.linhas, catalogo);
  const pendente = mapeamento.pendentes.length > 0 || r3.categoriasDesconhecidas.length > 0;
  const avisos = [...r3.avisos, ...mapeamento.avisos];
  const { data: imp, error } = await supabase.from("importacoes").insert({ unidade_id: sessao.unidadeId, tipo: "altec_r3", arquivo: nome, hash, periodo_inicio: inicio, periodo_fim: fim, linhas: r3.linhas.length, status: pendente ? "pendente" : "concluida", avisos, resumo: { lidas: r3.linhasLidas, ignoradas: r3.linhasIgnoradas, mapeadas: mapeamento.mapeadas.length, pendentes: mapeamento.pendentes.length } }).select("id").single();
  if (error || !imp) return erro(error?.message ?? "Falha ao registrar a importação.");
  const linhas = [...mapeamento.mapeadas.map((l) => ({ ...l, produtoId: l.produtoId as string | null })), ...mapeamento.pendentes.map((l) => ({ ...l, produtoId: null as string | null }))];
  const registros = linhas.map((l) => ({
    unidade_id: sessao.unidadeId,
    importacao_id: imp.id,
    data: fim,
    id_altec: l.idAltec,
    nome_altec: l.nomeAltec,
    produto_id: l.produtoId,
    categoria_altec: l.categoriaAltec,
    qtde: l.qtde,
    vl_tabela: l.vlTabela,
    desc_prod: l.descProd ?? 0,
    desc_global: l.descGlobal ?? 0,
    val_bruto: l.valBruto ?? l.total,
    total: l.total,
    gratuita_2x1: l.qtde > 0 && l.total === 0 && (l.vlTabela ?? 0) > 0,
  }));
  for (let i = 0; i < registros.length; i += 500) {
    const { error: e2 } = await supabase.from("vendas_itens").insert(registros.slice(i, i + 500));
    if (e2) return erro(e2.message);
  }
  const pendencias = [
    ...mapeamento.pendentes.map((l) => ({ unidade_id: sessao.unidadeId, importacao_id: imp.id, tipo: "produto_sem_mapeamento", id_altec: l.idAltec, nome_altec: l.nomeAltec, categoria_altec: l.categoriaAltec, qtde: l.qtde, total: l.total, bloco: l.bloco, dados: l })),
    ...r3.categoriasDesconhecidas.map((c) => ({ unidade_id: sessao.unidadeId, importacao_id: imp.id, tipo: "categoria_desconhecida", id_altec: null, nome_altec: null, categoria_altec: c, qtde: r3.linhas.filter((l) => l.categoriaAltec === c).reduce((s, l) => s + l.qtde, 0), total: r3.linhas.filter((l) => l.categoriaAltec === c).reduce((s, l) => s + l.total, 0), bloco: null, dados: {} })),
  ];
  if (pendencias.length > 0) await supabase.from("importacao_pendencias").insert(pendencias);
  const gratuitas = registros.filter((r) => r.gratuita_2x1).length;
  return ok(`R3 importado: ${mapeamento.mapeadas.length} linhas mapeadas, ${mapeamento.pendentes.length} na fila, ${r3.categoriasDesconhecidas.length} categoria(s) desconhecida(s), ${gratuitas} linha(s) com desconto de 100% marcadas como gratuitas 2x1. Período ${inicio} a ${fim}.`);
}

async function importarDia(tabela: Tabela, nome: string, hash: string, dataInformada: string): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const { data: par } = await supabase.from("parametros").select("taxa_servico_pct").eq("unidade_id", sessao.unidadeId).maybeSingle();
  const dia = lerAltecDia(tabela, { taxaServicoPct: Number(par?.taxa_servico_pct ?? 0.13) });
  if (dia.linhas.length === 0) return erro(`Nenhuma linha de venda encontrada. Avisos: ${dia.avisos.join("; ") || "nenhum"}`);
  const data = dia.data ?? dataInformada;
  const { data: imp, error } = await supabase.from("importacoes").insert({ unidade_id: sessao.unidadeId, tipo: "altec_dia", arquivo: nome, hash, periodo_inicio: data, periodo_fim: data, linhas: dia.linhas.length, status: "concluida", avisos: dia.avisos, resumo: { vendas: dia.vendas, taxa: dia.taxaServico, segmentos: dia.porSegmento } }).select("id").single();
  if (error || !imp) return erro(error?.message ?? "Falha ao registrar a importação.");
  const { data: atual } = await supabase.from("vendas_dia").select("clientes, comandas, ocorrencia, teve_2x1").eq("unidade_id", sessao.unidadeId).eq("data", data).maybeSingle();
  const { error: e2 } = await supabase.from("vendas_dia").upsert({ unidade_id: sessao.unidadeId, data, faturamento_bruto: dia.vendas, taxa_servico: dia.taxaServico, por_segmento: dia.porSegmento, pratos_vendidos: dia.pratosVendidos, importacao_id: imp.id, clientes: atual?.clientes ?? null, comandas: atual?.comandas ?? null, ocorrencia: atual?.ocorrencia ?? null, teve_2x1: atual?.teve_2x1 ?? false }, { onConflict: "unidade_id,data" });
  if (e2) return erro(e2.message);
  await supabase.from("vendas_colaborador_dia").delete().eq("unidade_id", sessao.unidadeId).eq("data", data);
  if (dia.porColaborador.length > 0) {
    const { data: colaboradores } = await supabase.from("colaboradores").select("id, codigo_altec, nome").eq("unidade_id", sessao.unidadeId);
    const porCodigo = new Map((colaboradores ?? []).filter((c) => c.codigo_altec).map((c) => [String(c.codigo_altec), c.id as string]));
    await supabase.from("vendas_colaborador_dia").insert(dia.porColaborador.map((c) => ({ unidade_id: sessao.unidadeId, data, colaborador_id: c.codigo ? (porCodigo.get(c.codigo) ?? null) : null, codigo: c.codigo, nome: c.nome, segmento: c.segmento, receita: c.receita, itens: c.itens })));
  }
  return ok(`Venda do dia ${data} importada: faturamento com taxa ${dia.faturamentoBruto.toFixed(2)}, ${dia.porColaborador.length} colaborador(es)${dia.taxaServicoExplicita ? "" : " (taxa de serviço calculada pelo parâmetro)"}. Lance clientes e comandas no fechamento se o arquivo não trouxe.`);
}

async function importarSantander(tabela: Tabela, nome: string, hash: string): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const extrato = lerExtratoSantander(tabela);
  if (extrato.lancamentos.length === 0) return erro(`Nenhum lançamento encontrado. Avisos: ${extrato.avisos.join("; ") || "nenhum"}`);
  const { data: imp, error } = await supabase.from("importacoes").insert({ unidade_id: sessao.unidadeId, tipo: "santander", arquivo: nome, hash, periodo_inicio: extrato.periodo?.inicio ?? null, periodo_fim: extrato.periodo?.fim ?? null, linhas: extrato.lancamentos.length, status: "concluida", avisos: extrato.avisos, resumo: { debitos: extrato.totalDebitos, creditos: extrato.totalCreditos } }).select("id").single();
  if (error || !imp) return erro(error?.message ?? "Falha ao registrar a importação.");
  const { data: regras } = await supabase.from("classificacao_regras").select("descricao_chave, conta_id").eq("unidade_id", sessao.unidadeId);
  const regra = new Map((regras ?? []).map((r) => [r.descricao_chave as string, r.conta_id as string]));
  const debitos = extrato.lancamentos.filter((l) => l.tipo === "D");
  if (debitos.length > 0) {
    const { error: e2 } = await supabase.from("despesas").insert(debitos.map((l) => ({ unidade_id: sessao.unidadeId, competencia: `${l.data.slice(0, 7)}-01`, data_caixa: l.data, conta_id: regra.get(l.descricaoChave) ?? null, valor: l.valor, descricao: l.descricao, descricao_chave: l.descricaoChave, origem: "santander", importacao_id: imp.id, confirmada: false })));
    if (e2) return erro(e2.message);
  }
  const porDia = new Map<string, { adquirente: number; marketplace: number; pix: number }>();
  for (const l of extrato.lancamentos.filter((x) => x.tipo === "C")) {
    const d = porDia.get(l.data) ?? { adquirente: 0, marketplace: 0, pix: 0 };
    if (l.origemCredito === "adquirente") d.adquirente += l.valor;
    else if (l.origemCredito === "marketplace") d.marketplace += l.valor;
    else if (l.origemCredito === "pix") d.pix += l.valor;
    porDia.set(l.data, d);
  }
  for (const [data, d] of porDia) {
    const { data: atual } = await supabase.from("conciliacao_dia").select("vendas_sistema, recebido_pix_dinheiro").eq("unidade_id", sessao.unidadeId).eq("data", data).maybeSingle();
    await supabase.from("conciliacao_dia").upsert({ unidade_id: sessao.unidadeId, data, vendas_sistema: atual?.vendas_sistema ?? null, recebido_adquirente: d.adquirente, recebido_marketplace: d.marketplace, recebido_pix_dinheiro: atual?.recebido_pix_dinheiro ?? (d.pix > 0 ? d.pix : null) }, { onConflict: "unidade_id,data" });
  }
  const sugeridas = debitos.filter((l) => regra.has(l.descricaoChave)).length;
  return ok(`Extrato importado: ${debitos.length} débitos como despesas a classificar (${sugeridas} com conta sugerida pelas classificações anteriores), créditos de ${porDia.size} dia(s) na conciliação.`);
}

async function importarComanda(tabela: Tabela, nome: string, hash: string, dataInformada: string): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const r = lerComandas(tabela);
  if (r.atendimentos.length === 0) return erro(`Nenhum atendimento encontrado. Avisos: ${r.avisos.join("; ") || "nenhum"}`);
  const datas = r.atendimentos.map((a) => a.data ?? dataInformada);
  const { data: imp, error } = await supabase.from("importacoes").insert({ unidade_id: sessao.unidadeId, tipo: "comanda", arquivo: nome, hash, periodo_inicio: datas.reduce((a, b) => (a < b ? a : b)), periodo_fim: datas.reduce((a, b) => (a > b ? a : b)), linhas: r.atendimentos.length, status: "concluida", avisos: r.avisos, resumo: { itens: r.itens.length } }).select("id").single();
  if (error || !imp) return erro(error?.message ?? "Falha ao registrar a importação.");
  const { data: colaboradores } = await supabase.from("colaboradores").select("id, codigo_altec").eq("unidade_id", sessao.unidadeId);
  const porCodigo = new Map((colaboradores ?? []).filter((c) => c.codigo_altec).map((c) => [String(c.codigo_altec), c.id as string]));
  const carimbo = (data: string, hora: string | null) => {
    if (!hora) return null;
    const h = Number(hora.split(":")[0]);
    const d = new Date(`${data}T12:00:00Z`);
    if (h < 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().slice(0, 10)}T${hora}:00-03:00`;
  };
  const { error: e2 } = await supabase.from("atendimentos").insert(r.atendimentos.map((a) => {
    const data = a.data ?? dataInformada;
    return { unidade_id: sessao.unidadeId, importacao_id: imp.id, data, mesa: a.mesa, comanda: a.comanda, clientes: a.clientes, chegada: carimbo(data, a.chegada), saida: carimbo(data, a.saida), teve_entrada: a.teveEntrada, teve_sobremesa: a.teveSobremesa, teve_bebida: a.teveBebida, garcom_id: a.garcomCodigo ? (porCodigo.get(a.garcomCodigo) ?? null) : null, total: a.total };
  }));
  if (e2) return erro(e2.message);
  return ok(`${r.atendimentos.length} atendimentos importados; attach e giro por mesa destravados para o período.`);
}

async function importarCadastro(tabela: Tabela, nome: string, hash: string): Promise<Resultado> {
  const { supabase, sessao } = await bd();
  const r = lerCadastroInicial(tabela);
  const { data: imp, error } = await supabase.from("importacoes").insert({ unidade_id: sessao.unidadeId, tipo: "cadastro", arquivo: nome, hash, linhas: r.insumos.length + r.producoes.length + r.fichas.length, status: "concluida", avisos: [...r.avisos, ...r.relatorioInconsistencias.map((i) => `${i.tipo}: ${i.referencia} (${i.detalhe})`)], resumo: { insumos: r.insumos.length, producoes: r.producoes.length, fichas: r.fichas.length, inconsistencias: r.relatorioInconsistencias.length } }).select("id").single();
  if (error || !imp) return erro(error?.message ?? "Falha ao registrar a importação.");
  let criados = 0;
  let pulados = 0;
  const { data: existentes } = await supabase.from("insumos").select("id, nome").eq("unidade_id", sessao.unidadeId);
  const porNome = new Map((existentes ?? []).map((i) => [String(i.nome).toLowerCase(), i.id as string]));
  for (const ins of r.insumos) {
    if (porNome.has(ins.nome.toLowerCase())) { pulados++; continue; }
    if (ins.preco === null || ins.rendimentoPct === null || ins.rendimentoPct <= 0) { pulados++; continue; }
    const { data: novo } = await supabase.from("insumos").insert({ unidade_id: sessao.unidadeId, nome: ins.nome, categoria: ins.categoria, unidade_uso: ins.unidadeUso ?? "kg", unidade_compra: ins.unidadeCompra ?? ins.unidadeUso ?? "kg" }).select("id").single();
    if (novo) {
      await supabase.from("insumo_precos").insert({ unidade_id: sessao.unidadeId, insumo_id: novo.id, preco_por_unidade: ins.preco, rendimento_pct: ins.rendimentoPct / 100, vigencia_inicio: ins.dataPreco ?? hojeIso(), origem: "altec" });
      porNome.set(ins.nome.toLowerCase(), novo.id);
      criados++;
    }
  }
  const { data: producoesExistentes } = await supabase.from("producoes").select("id, nome").eq("unidade_id", sessao.unidadeId);
  const prodPorNome = new Map((producoesExistentes ?? []).map((p) => [String(p.nome).toLowerCase(), p.id as string]));
  for (const pr of r.producoes) {
    if (prodPorNome.has(pr.nome.toLowerCase())) { pulados++; continue; }
    const { data: novo } = await supabase.from("producoes").insert({ unidade_id: sessao.unidadeId, nome: pr.nome, codigo_altec: pr.codigoAltec, unidade_rendimento: pr.unidadeRendimento ?? "kg", rendimento_declarado: pr.rendimento, observacao: pr.rendimento === null ? "Batelada pendente: medir rendimento e cadastrar os itens" : null }).select("id").single();
    if (novo) {
      if (pr.custoPorUnidade !== null) await supabase.from("producao_custos").insert({ unidade_id: sessao.unidadeId, producao_id: novo.id, custo_por_unidade: pr.custoPorUnidade, origem: "altec", vigencia_inicio: hojeIso() });
      prodPorNome.set(pr.nome.toLowerCase(), novo.id);
      criados++;
    }
  }
  const { data: produtos } = await supabase.from("produtos").select("id, nome, id_altec").eq("unidade_id", sessao.unidadeId);
  let fichasCriadas = 0;
  for (const f of r.fichas) {
    const produto = (produtos ?? []).find((p) => (f.idAltec && p.id_altec === f.idAltec) || String(p.nome).toLowerCase() === f.produto.toLowerCase());
    if (!produto) { pulados++; continue; }
    const itens = f.itens.map((i) => {
      const insumoId = i.tipo !== "producao" ? porNome.get(i.nomeComponente.toLowerCase()) : undefined;
      const producaoId = i.tipo !== "insumo" ? prodPorNome.get(i.nomeComponente.toLowerCase()) : undefined;
      return { insumo_id: insumoId ?? null, producao_id: insumoId ? null : (producaoId ?? null), quantidade: i.quantidade, unidade: i.unidadeNormalizada };
    });
    if (itens.some((i) => (!i.insumo_id && !i.producao_id) || !i.quantidade || !i.unidade)) { pulados++; continue; }
    const { error: e3 } = await supabase.rpc("f_nova_versao_ficha", { p_produto: produto.id, p_motivo: `Importação do cadastro (${nome})`, p_itens: itens, p_vigencia: hojeIso() });
    if (!e3) fichasCriadas++; else pulados++;
  }
  return ok(`Cadastro importado: ${criados} insumos e produções criados, ${fichasCriadas} fichas geradas, ${pulados} itens pulados (já existentes ou com inconsistência). Relatório de inconsistência: ${r.relatorioInconsistencias.length} apontamento(s), nos avisos da importação.`);
}

export async function resolverPendencia(_a: Resultado, form: FormData): Promise<Resultado> {
  const pendencia = texto(form, "pendencia_id");
  const produto = texto(form, "produto_id");
  if (!pendencia || !produto) return erro("Escolha o produto.");
  const { supabase } = await bd();
  const { data, error } = await supabase.rpc("f_resolver_pendencia", { p_pendencia: pendencia, p_produto: produto });
  if (error) return erro(error.message);
  revalidatePath("/importar");
  revalidatePath("/leitura/semana");
  return ok(`${data ?? 0} linha(s) ligadas ao produto.`);
}

export async function criarProdutoEResolver(_a: Resultado, form: FormData): Promise<Resultado> {
  const pendencia = texto(form, "pendencia_id");
  const nome = texto(form, "nome");
  const bloco = texto(form, "bloco");
  if (!pendencia || !nome || !bloco) return erro("Informe nome e bloco.");
  const { supabase, sessao } = await bd();
  const { data: pend } = await supabase.from("importacao_pendencias").select("id_altec, nome_altec").eq("id", pendencia).maybeSingle();
  const { data: produto, error } = await supabase.from("produtos").insert({ unidade_id: sessao.unidadeId, nome, bloco, id_altec: pend?.id_altec ?? null, nome_altec: pend?.nome_altec ?? nome }).select("id").single();
  if (error || !produto) return erro(error?.message ?? "Falha ao criar o produto.");
  const { error: e2 } = await supabase.rpc("f_resolver_pendencia", { p_pendencia: pendencia, p_produto: produto.id });
  if (e2) return erro(e2.message);
  revalidatePath("/importar");
  return ok(`Produto ${nome} criado e mapeado. Cadastre o preço e a ficha em Cadastro › Produtos.`);
}
