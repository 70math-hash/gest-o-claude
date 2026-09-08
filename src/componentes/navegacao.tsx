"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Perfil } from "@/lib/sessao";

interface Item {
  href: string;
  rotulo: string;
  perfis: Perfil[];
}

/** Navegação pelos rituais da casa (seção 7), não por módulo. */
export const ITENS: Item[] = [
  { href: "/hoje", rotulo: "Hoje", perfis: ["dono", "gestor", "cozinha", "salao"] },
  { href: "/captura", rotulo: "Captura", perfis: ["dono", "gestor", "cozinha", "salao"] },
  { href: "/leitura", rotulo: "Leitura", perfis: ["dono", "gestor"] },
  { href: "/cadastro", rotulo: "Cadastro", perfis: ["dono", "gestor", "cozinha", "salao"] },
  { href: "/importar", rotulo: "Importar", perfis: ["dono", "gestor"] },
];

export function Navegacao({ perfil, vertical }: { perfil: Perfil; vertical?: boolean }) {
  const caminho = usePathname();
  const itens = ITENS.filter((i) => i.perfis.includes(perfil));
  return (
    <nav className={vertical ? "flex flex-col p-2" : "flex justify-around"}>
      {itens.map((item) => {
        const ativo = caminho === item.href || caminho.startsWith(item.href + "/");
        const base = vertical ? "px-3 py-2 text-sm" : "flex-1 py-3 text-center text-xs";
        return (
          <Link key={item.href} href={item.href} className={`${base} ${ativo ? "bg-preto text-papel" : "text-preto hover:bg-cinza-claro"}`}>
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
