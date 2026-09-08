"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";

export async function salvarRecebimento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  if (!data) return erro("Data inválida.");
  const itens: Array<{ insumo_id: string; quantidade: number; preco_unitario: number; temperatura_recebimento: number | null; validade: string | null }> = [];
  for (let i = 0; i < 20; i++) {
    const insumo = texto(form, `insumo:${i}`);
    if (!insumo) continue;
    const quantidade = numeroForm(form, `quantidade:${i}`);
    const preco = numeroForm(form, `preco:${i}`);
    if (!quantidade || quantidade <= 0 || preco === null || preco < 0) return erro(`Linha ${i + 1}: informe quantidade e preço.`);
    itens.push({ insumo_id: insumo, quantidade, preco_unitario: preco, temperatura_recebimento: numeroForm(form, `temperatura:${i}`), validade: dataForm(form, `validade:${i}`) });
  }
  if (itens.length === 0) return erro("Nenhum item informado.");
  const { supabase, sessao } = await bd();
  const total = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const { data: compra, error } = await supabase.from("compras").insert({ unidade_id: sessao.unidadeId, data, fornecedor_id: texto(form, "fornecedor_id"), nota_numero: texto(form, "nota_numero"), total, conferido_por: sessao.usuarioId }).select("id").single();
  if (error || !compra) return erro(error?.message ?? "Falha ao gravar a nota.");
  const { error: e2 } = await supabase.from("compra_itens").insert(itens.map((i) => ({ ...i, compra_id: compra.id, unidade_id: sessao.unidadeId })));
  if (e2) {
    await supabase.from("compras").delete().eq("id", compra.id);
    return erro(e2.message.includes("rendimento") ? "Um dos insumos está sem rendimento cadastrado. Cadastro sem rendimento não salva: informe o rendimento em Cadastro › Insumos." : e2.message);
  }
  revalidatePath("/captura/recebimento");
  revalidatePath("/cadastro/insumos");
  return ok(`Nota lançada com ${itens.length} itens; preços vigentes atualizados com origem nota.`);
}
