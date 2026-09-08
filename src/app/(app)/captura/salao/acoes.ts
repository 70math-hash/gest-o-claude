"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, marcado, numeroForm, ok, texto, type Resultado } from "@/lib/acoes";

function carimbo(data: string, hora: string | null): string | null {
  if (!hora) return null;
  // Serviço de jantar: hora antes das 06:00 pertence à madrugada do dia seguinte.
  const [h] = hora.split(":").map(Number);
  const dia = (h ?? 0) < 6 ? new Date(`${data}T12:00:00-03:00`) : null;
  if (dia) {
    dia.setUTCDate(dia.getUTCDate() + 1);
    return `${dia.toISOString().slice(0, 10)}T${hora}:00-03:00`;
  }
  return `${data}T${hora}:00-03:00`;
}

export async function salvarReserva(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const hora = texto(form, "hora");
  const pessoas = numeroForm(form, "pessoas");
  if (!data || !hora || !pessoas) return erro("Informe hora e pessoas.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("reservas").insert({ unidade_id: sessao.unidadeId, data, hora, pessoas, nome: texto(form, "nome"), mesa: texto(form, "mesa"), status: "confirmada" });
  if (error) return erro(error.message);
  revalidatePath("/captura/salao");
  revalidatePath("/hoje");
  return ok("Reserva confirmada.");
}

export async function mudarStatusReserva(id: string, status: string, _data: string): Promise<void> {
  const { supabase } = await bd();
  await supabase.from("reservas").update({ status }).eq("id", id);
  revalidatePath("/captura/salao");
  revalidatePath("/hoje");
}

export async function salvarAtendimento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  const mesa = texto(form, "mesa");
  const clientes = numeroForm(form, "clientes");
  if (!data || !mesa || !clientes) return erro("Informe mesa e clientes.");
  const { supabase, sessao } = await bd();
  const { error } = await supabase.from("atendimentos").insert({
    unidade_id: sessao.unidadeId,
    data,
    mesa,
    clientes,
    chegada: carimbo(data, texto(form, "chegada")),
    saida: carimbo(data, texto(form, "saida")),
    teve_entrada: marcado(form, "teve_entrada"),
    teve_sobremesa: marcado(form, "teve_sobremesa"),
    teve_bebida: marcado(form, "teve_bebida"),
    garcom_id: texto(form, "garcom_id"),
    total: numeroForm(form, "total"),
  });
  if (error) return erro(error.message);
  revalidatePath("/captura/salao");
  return ok("Atendimento lançado.");
}
