/**
 * Sessão da pessoa logada: usuário do Auth e perfil (dono, gestor, cozinha,
 * salão) com a unidade. Sem perfil ativo não há acesso a nenhuma tela.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { MODO_LOCAL, clienteServidor } from "./supabase/servidor";

export type Perfil = "dono" | "gestor" | "cozinha" | "salao";

export interface Sessao {
  usuarioId: string;
  email: string;
  nome: string | null;
  perfil: Perfil;
  unidadeId: string;
  unidadeNome: string;
}

export const NOMES_PERFIL: Record<Perfil, string> = { dono: "Dono", gestor: "Gestor", cozinha: "Cozinha", salao: "Salão" };

/** Usuário logado (ou null). Em modo local, o dono fixo do JWT. */
export const usuarioAtual = cache(async (): Promise<{ id: string; email: string } | null> => {
  if (MODO_LOCAL) return { id: process.env.LOCAL_USUARIO_ID ?? "", email: process.env.LOCAL_USUARIO_EMAIL ?? "70math@gmail.com" };
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Sessão completa: redireciona para /entrar sem usuário e para /sem-acesso sem perfil. */
export const sessaoAtual = cache(async (): Promise<Sessao> => {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const supabase = await clienteServidor();
  const { data } = await supabase.from("perfis").select("usuario_id, email, nome, perfil, unidade_id, unidades(nome)").eq("usuario_id", usuario.id).eq("ativo", true).maybeSingle();
  if (!data) redirect("/sem-acesso");
  const unidade = data.unidades as unknown as { nome: string } | { nome: string }[] | null;
  return {
    usuarioId: data.usuario_id as string,
    email: data.email as string,
    nome: (data.nome as string | null) ?? null,
    perfil: data.perfil as Perfil,
    unidadeId: data.unidade_id as string,
    unidadeNome: Array.isArray(unidade) ? (unidade[0]?.nome ?? "") : (unidade?.nome ?? ""),
  };
});

export function podeGerir(perfil: Perfil): boolean {
  return perfil === "dono" || perfil === "gestor";
}
