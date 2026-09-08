import { usuarioAtual } from "@/lib/sessao";
import { BotaoSair } from "@/componentes/botao-sair";

export const metadata = { title: "Sem acesso · QT GESTÃO" };

export default async function PaginaSemAcesso() {
  const usuario = await usuarioAtual();
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-sm text-sm">
        <div className="text-2xl font-bold tracking-wide">QT GESTÃO</div>
        <p className="mt-6">{usuario ? `O e-mail ${usuario.email} entrou, mas não tem perfil nesta casa.` : "Você não está logado."}</p>
        <p className="mt-2 text-cinza">Peça ao dono para autorizar o e-mail em Cadastro › Usuários. O acesso abre no próximo login.</p>
        <div className="mt-6">
          <BotaoSair />
        </div>
      </div>
    </main>
  );
}
