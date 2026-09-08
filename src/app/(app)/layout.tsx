import Link from "next/link";
import { NOMES_PERFIL, sessaoAtual } from "@/lib/sessao";
import { BotaoSair } from "@/componentes/botao-sair";
import { Navegacao } from "@/componentes/navegacao";

// Toda tela do app lê a sessão e o banco: nunca pré-renderizar no build.
export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-cinza-claro lg:bg-branco">
        <div className="border-b border-cinza-claro p-5">
          <Link href="/hoje" className="text-xl font-bold tracking-widest">
            QT GESTÃO
          </Link>
          <div className="mt-1 text-xs text-cinza-escuro">{sessao.unidadeNome}</div>
        </div>
        <Navegacao perfil={sessao.perfil} vertical />
        <div className="mt-auto border-t border-cinza-claro p-4 text-xs text-cinza-escuro">
          <div className="truncate">{sessao.nome ?? sessao.email}</div>
          <div className="mb-3">{NOMES_PERFIL[sessao.perfil]}</div>
          <BotaoSair />
        </div>
      </aside>
      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-cinza-claro bg-branco px-4 py-3 lg:hidden">
          <Link href="/hoje" className="text-lg font-bold tracking-widest">
            QT GESTÃO
          </Link>
          <div className="text-xs text-cinza-escuro">{NOMES_PERFIL[sessao.perfil]}</div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-cinza-claro bg-branco lg:hidden">
          <Navegacao perfil={sessao.perfil} />
        </div>
      </div>
    </div>
  );
}
