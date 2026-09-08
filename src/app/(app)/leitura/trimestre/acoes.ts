"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, ok, texto, type Resultado } from "@/lib/acoes";

export async function registrarDecisao(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const bloco = texto(form, "bloco");
  const matriz = texto(form, "matriz");
  const inicio = dataForm(form, "inicio");
  const fim = dataForm(form, "fim");
  const decisao = texto(form, "decisao");
  if (!bloco || !matriz || !inicio || !fim || !decisao) return erro("Informe a decisão.");
  const { supabase, sessao } = await bd();
  const { data: resultado } = await supabase.rpc("v_engenharia_cardapio", { p_unidade: sessao.unidadeId, p_inicio: inicio, p_fim: fim, p_bloco: bloco, p_matriz: matriz });
  const { data: par } = await supabase.from("parametros").select("fator_popularidade").eq("unidade_id", sessao.unidadeId).maybeSingle();
  const { error } = await supabase.from("decisoes_engenharia").insert({ unidade_id: sessao.unidadeId, bloco, matriz, periodo_inicio: inicio, periodo_fim: fim, fator_popularidade: par?.fator_popularidade ?? 0.7, resultado: resultado ?? [], decisao });
  if (error) return erro(error.message);
  revalidatePath("/leitura/trimestre");
  return ok("Decisão registrada com a matriz e o resultado do momento.");
}
