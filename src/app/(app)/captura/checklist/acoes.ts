"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, marcado, ok, texto, type Resultado } from "@/lib/acoes";

export async function assinarChecklist(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const praca = texto(form, "praca");
  const tipo = texto(form, "tipo");
  if (!data || !praca || !tipo) return erro("Checklist inválido.");
  const itens: Array<{ item: string; ok: boolean }> = [];
  for (const nome of form.keys()) {
    const m = /^rotulo:(\d+)$/.exec(nome);
    if (!m) continue;
    itens.push({ item: String(form.get(nome)), ok: marcado(form, `item:${m[1]}`) });
  }
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("checklists").upsert({ unidade_id: sessao.unidadeId, data, praca, tipo, itens_json: itens, assinado_por: sessao.usuarioId, assinado_em: new Date().toISOString() }, { onConflict: "unidade_id,data,praca,tipo" });
  if (error) return erro(error.message);
  revalidatePath("/captura/checklist");
  const pendentes = itens.filter((i) => !i.ok).length;
  return ok(pendentes > 0 ? `Assinado com ${pendentes} item(ns) não conferido(s).` : "Assinado.");
}
