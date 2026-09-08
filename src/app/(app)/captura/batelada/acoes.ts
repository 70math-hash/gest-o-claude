"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";
import { desvioRendimento } from "@/motor";
import { formatarPercentual } from "@/formato";

export async function salvarBatelada(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const producaoId = texto(form, "producao_id");
  const real = numeroForm(form, "rendimento_real");
  if (!data || !producaoId || !real || real <= 0) return erro("Informe a produção e o rendimento real pesado.");
  const { supabase, sessao } = await bd();
  const { data: producao } = await supabase.from("producoes").select("rendimento_declarado").eq("id", producaoId).maybeSingle();
  const declarado = producao?.rendimento_declarado ? Number(producao.rendimento_declarado) : null;
  if (!declarado) return erro("Produção sem rendimento declarado: cadastre o rendimento antes de lançar batelada.");
  const { error } = await supabase.from("bateladas").insert({ unidade_id: sessao.unidadeId, data, producao_id: producaoId, rendimento_real: real, rendimento_declarado_snapshot: declarado, observacao: texto(form, "observacao") });
  if (error) return erro(error.message);
  revalidatePath("/captura/batelada");
  const d = desvioRendimento(real, declarado);
  return ok(`Batelada lançada. Desvio ${formatarPercentual(d.desvio)}${d.alerta ? ": alerta, acima de 3%." : "."}`);
}
