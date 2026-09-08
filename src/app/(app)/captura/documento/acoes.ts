"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";

export async function salvarDocumento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, "nome");
  const tipo = texto(form, "tipo");
  const vencimento = dataForm(form, "vencimento");
  if (!nome || !tipo || !vencimento) return erro("Informe nome, tipo e vencimento.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("documentos_risco").insert({ unidade_id: sessao.unidadeId, nome, tipo, vencimento, responsavel_id: texto(form, "responsavel_id"), alerta_dias: numeroForm(form, "alerta_dias") ?? 60 });
  if (error) return erro(error.message);
  revalidatePath("/captura/documento");
  return ok("Documento salvo.");
}
