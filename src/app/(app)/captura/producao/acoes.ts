"use server";
import { revalidatePath } from "next/cache";
import { bd } from "@/lib/dados/base";
import { dataForm, erro, numeroForm, ok, type Resultado } from "@/lib/acoes";

export async function salvarProducaoDoDia(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const data = dataForm(form, "data");
  if (!data) return erro("Data inválida.");
  const { supabase, sessao } = await bd();
  // Campos nomeados "planejado:produto:uuid", "produzido:producao:uuid" etc.
  const registros: Array<Record<string, unknown>> = [];
  const vistas = new Set<string>();
  for (const nome of form.keys()) {
    const partes = nome.split(":");
    if (partes.length !== 3) continue;
    const [, tipo, id] = partes;
    const chave = `${tipo}:${id}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const planejado = numeroForm(form, `planejado:${chave}`);
    const produzido = numeroForm(form, `produzido:${chave}`);
    const sobra = numeroForm(form, `sobra:${chave}`);
    const refeitos = numeroForm(form, `refeitos:${chave}`);
    if (planejado === null && produzido === null && sobra === null && refeitos === null) continue;
    if (sobra !== null && produzido !== null && sobra > produzido) return erro(`Sobra maior que o produzido em um item (${chave}).`);
    registros.push({ unidade_id: sessao.unidadeId, data, producao_id: tipo === "producao" ? id : null, produto_id: tipo === "produto" ? id : null, planejado, produzido, sobra, refeitos: refeitos ?? 0 });
  }
  if (registros.length === 0) return erro("Nenhum item preenchido.");
  await supabase.from("producao_diaria").delete().eq("unidade_id", sessao.unidadeId).eq("data", data);
  const { error } = await supabase.from("producao_diaria").insert(registros);
  if (error) return erro(error.message);
  revalidatePath("/captura/producao");
  return ok(`${registros.length} itens salvos.`);
}
