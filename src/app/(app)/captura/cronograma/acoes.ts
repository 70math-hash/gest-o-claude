"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";

export async function conferirEtapa(id: string, _data: string): Promise<void> {
  const { supabase, sessao } = await bd();
  await supabase.from("cronograma_etapas").update({ conferido_em: new Date().toISOString(), conferido_por: sessao.usuarioId }).eq("id", id);
  revalidatePath("/captura/cronograma");
}

export async function desfazerConferido(id: string, _data: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("cronograma_etapas").update({ conferido_em: null, conferido_por: null }).eq("id", id);
  revalidatePath("/captura/cronograma");
}
