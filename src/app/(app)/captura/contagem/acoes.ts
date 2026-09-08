"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, marcado, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";

export async function salvarContagem(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const tipo = texto(form, "tipo");
  const base = texto(form, "base");
  if (!data || !tipo || !base) return erro("Contagem inválida.");
  const itens: Array<{ insumo_id: string; quantidade_contada: number }> = [];
  for (const nome of form.keys()) {
    if (!nome.startsWith("qtd:")) continue;
    const q = numeroForm(form, nome);
    if (q === null || q < 0) continue;
    itens.push({ insumo_id: nome.slice(4), quantidade_contada: q });
  }
  if (itens.length === 0) return erro("Nenhum item contado.");
  const { supabase, sessao } = await bd();
  const { data: inv, error } = await supabase.from("inventarios").insert({ unidade_id: sessao.unidadeId, data, tipo, base, fechado: false }).select("id").single();
  if (error || !inv) return erro(error?.message ?? "Falha ao abrir o inventário.");
  const { error: e2 } = await supabase.from("inventario_itens").insert(itens.map((i) => ({ ...i, inventario_id: inv.id, unidade_id: sessao.unidadeId })));
  if (e2) return erro(e2.message);
  if (marcado(form, "fechar")) await supabase.from("inventarios").update({ fechado: true }).eq("id", inv.id);
  revalidatePath("/captura/contagem");
  return ok(`Inventário ${tipo} de ${base} salvo com ${itens.length} itens${marcado(form, "fechar") ? " e fechado" : ""}.`);
}
