import Link from "next/link";
import { hojeIso, formatarDataIso, nomeDiaSemana } from "@/formato";
import { sessaoAtual, type Perfil } from "@/lib/sessao";
import { Titulo } from "@/componentes/ui";

export const metadata = { title: "Captura" };

interface Tela {
  href: string;
  nome: string;
  quem: string;
  oQueEntra: string;
  tempo: string;
  perfis: Perfil[];
}

/** Seção 7.1: telas de captura, mobile-first, organizadas pelo ritual. */
const TELAS: Tela[] = [
  { href: "/captura/fechamento", nome: "Fechamento do dia", quem: "gestor", oQueEntra: "upload ou colagem do export do Altec; clientes e comandas se não vier no arquivo; os quatro números da conciliação; perdas, cortesias e degustações; ocorrência do serviço", tempo: "5 min", perfis: ["dono", "gestor"] },
  { href: "/captura/producao", nome: "Produção do dia", quem: "cozinha", oQueEntra: "para cada produção ou item do mapa de mise: planejado (sugerido), produzido, sobra", tempo: "3 min", perfis: ["dono", "gestor", "cozinha"] },
  { href: "/captura/batelada", nome: "Batelada", quem: "cozinha", oQueEntra: "produção e rendimento real pesado; o sistema mostra o declarado e o desvio na hora", tempo: "30 s", perfis: ["dono", "gestor", "cozinha"] },
  { href: "/captura/cronograma", nome: "Cronograma", quem: "cozinha", oQueEntra: "etapas do dia com hora prevista, botão conferido, responsável", tempo: "10 s por etapa", perfis: ["dono", "gestor", "cozinha"] },
  { href: "/captura/checklist", nome: "Checklist de praça", quem: "cozinha", oQueEntra: "abertura e fechamento, assinado", tempo: "2 min", perfis: ["dono", "gestor", "cozinha", "salao"] },
  { href: "/captura/recebimento", nome: "Recebimento", quem: "cozinha ou gestor", oQueEntra: "fornecedor, nota, itens com quantidade, preço, temperatura e validade; gera preço vigente", tempo: "3 min por nota", perfis: ["dono", "gestor", "cozinha"] },
  { href: "/captura/contagem", nome: "Contagem", quem: "cozinha ou gestor", oQueEntra: "inventário rotativo dos itens classe A (semanal) ou geral (mensal), com o último preço vigente", tempo: "15 min ou 60 min", perfis: ["dono", "gestor", "cozinha"] },
  { href: "/captura/salao", nome: "Reservas e salão", quem: "salão", oQueEntra: "reservas com status e, por atendimento: mesa, clientes, chegada, saída, teve entrada, sobremesa, bebida", tempo: "por atendimento", perfis: ["dono", "gestor", "salao"] },
  { href: "/captura/documento", nome: "Documento de risco", quem: "gestor", oQueEntra: "nome, tipo, vencimento, responsável", tempo: "1 min", perfis: ["dono", "gestor"] },
];

export default async function PaginaCaptura() {
  const sessao = await sessaoAtual();
  const hoje = hojeIso();
  const telas = TELAS.filter((t) => t.perfis.includes(sessao.perfil));
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(hoje)}, ${formatarDataIso(hoje)} · captura em menos de 10 minutos por dia`}>Captura</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {telas.map((t) => (
          <Link key={t.href} href={`${t.href}?data=${hoje}`} className="block border border-cinza-claro bg-branco p-4 hover:border-preto">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-base font-semibold">{t.nome}</div>
              <div className="num text-xs text-cinza-escuro">{t.tempo}</div>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-cinza-escuro">{t.quem}</div>
            <div className="mt-2 text-sm text-cinza-escuro">{t.oQueEntra}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
