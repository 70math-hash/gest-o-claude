"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, marcado, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";

export async function salvarFechamento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  if (!data) return erro("Data inválida.");
  const { supabase, sessao } = await bd();
  const faturamento = numeroForm(form, "faturamento_bruto");
  let taxa = numeroForm(form, "taxa_servico");
  if (taxa === null && faturamento !== null) {
    const { data: par } = await supabase.from("parametros").select("taxa_servico_pct").eq("unidade_id", sessao.unidadeId).maybeSingle();
    taxa = Math.round(faturamento * Number(par?.taxa_servico_pct ?? 0.13) * 100) / 100;
  }
  const segmentos: Record<string, number> = {};
  for (const seg of ["cozinha", "salao", "bar", "delivery"]) {
    const valor = numeroForm(form, `seg_${seg}`);
    if (valor !== null) segmentos[seg] = valor;
  }
  const venda = {
    unidade_id: sessao.unidadeId,
    data,
    faturamento_bruto: faturamento,
    taxa_servico: taxa,
    clientes: numeroForm(form, "clientes"),
    comandas: numeroForm(form, "comandas"),
    pratos_vendidos: numeroForm(form, "pratos_vendidos"),
    por_segmento: segmentos,
    teve_2x1: marcado(form, "teve_2x1"),
    ocorrencia: texto(form, "ocorrencia"),
  };
  const { error } = await supabase.from("vendas_dia").upsert(venda, { onConflict: "unidade_id,data" });
  if (error) return erro(error.message);
  const conciliacao = {
    unidade_id: sessao.unidadeId,
    data,
    vendas_sistema: numeroForm(form, "vendas_sistema"),
    recebido_adquirente: numeroForm(form, "recebido_adquirente"),
    recebido_marketplace: numeroForm(form, "recebido_marketplace"),
    recebido_pix_dinheiro: numeroForm(form, "recebido_pix_dinheiro"),
  };
  if (Object.values(conciliacao).some((v) => typeof v === "number")) {
    const { error: e2 } = await supabase.from("conciliacao_dia").upsert(conciliacao, { onConflict: "unidade_id,data" });
    if (e2) return erro(e2.message);
  }
  revalidatePath("/hoje");
  revalidatePath("/captura/fechamento");
  return ok("Fechamento salvo. O painel do dia já reflete os números.");
}

export async function adicionarPerda(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const item = texto(form, "item");
  const quantidade = numeroForm(form, "quantidade");
  const motivo = texto(form, "motivo");
  if (!data || !item || !quantidade || !motivo) return erro("Informe item, motivo e quantidade.");
  const [tipo, id] = item.split(":");
  const { supabase, sessao } = await bd();
  let valor = numeroForm(form, "valor");
  if (valor === null) {
    if (tipo === "produto") {
      const { data: c } = await supabase.rpc("f_custo_produto", { p_produto: id, p_data: data });
      const custo = Array.isArray(c) && c[0] ? Number(c[0].custo) : null;
      if (custo !== null && Number.isFinite(custo)) valor = Math.round(custo * quantidade * 100) / 100;
    } else {
      const { data: p } = await supabase.rpc("f_preco_insumo", { p_insumo: id, p_data: data });
      const preco = Array.isArray(p) && p[0] ? Number(p[0].preco) : null;
      if (preco !== null && Number.isFinite(preco)) valor = Math.round(preco * quantidade * 100) / 100;
    }
  }
  const { error } = await supabase.from("perdas").insert({ unidade_id: sessao.unidadeId, data, produto_id: tipo === "produto" ? id : null, insumo_id: tipo === "insumo" ? id : null, quantidade, motivo, valor });
  if (error) return erro(error.message);
  revalidatePath("/captura/fechamento");
  return ok(valor === null ? "Perda lançada sem valor: item sem custo vigente." : "Perda lançada.");
}

export async function removerPerda(id: string, _data: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("perdas").delete().eq("id", id);
  revalidatePath("/captura/fechamento");
}
