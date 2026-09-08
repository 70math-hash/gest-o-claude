"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";

export async function marcarIndisponivel(_anterior: { erro: string | null }, form: FormData): Promise<{ erro: string | null }> {
  const data = String(form.get("data") ?? "");
  const produtoId = String(form.get("produto_id") ?? "");
  const motivo = String(form.get("motivo") ?? "").trim() || null;
  if (!data || !produtoId) return { erro: "Escolha o produto." };
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("indisponiveis").upsert({ unidade_id: sessao.unidadeId, data, produto_id: produtoId, motivo }, { onConflict: "unidade_id,data,produto_id" });
  if (error) return { erro: error.message };
  revalidatePath("/hoje");
  return { erro: null };
}

export async function removerIndisponivel(id: string, _data: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("indisponiveis").delete().eq("id", id);
  revalidatePath("/hoje");
}
