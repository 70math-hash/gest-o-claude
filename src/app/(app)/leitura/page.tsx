import Link from "next/link";
import { Titulo } from "@/componentes/ui";

export const metadata = { title: "Leitura" };

/** Seção 7.2: telas de leitura, organizadas pelo ritual. */
const TELAS = [
  { href: "/leitura/semana", nome: "Semana", ritual: "reunião semanal", conteudo: "CMV ponderado por bloco contra meta, gap parcial dos itens A, aderência ao cronograma, desvio de rendimento, sobra, ranking de pratos, attach, escala da semana seguinte contra a curva, POP auditado" },
  { href: "/leitura/mes", nome: "Mês", ritual: "fechamento mensal", conteudo: "DRE gerencial vertical com desvio contra orçamento, CMV real por base, gap de controle com decomposição, prime cost, ponto de equilíbrio e dia de virada, margem de segurança, folha, produtividade, horas extras, turnover, caixa 13 semanas, feedback" },
  { href: "/leitura/trimestre", nome: "Trimestre", ritual: "revisão trimestral", conteudo: "engenharia de cardápio nas duas matrizes, itens que mudam de quadrante, recotação dos itens A com impacto nas fichas, revisão de preço com piso e teto, avaliação e certificações, calendário de risco dos próximos 90 dias" },
  { href: "/leitura/painel", nome: "Painel único", ritual: "qualquer dia", conteudo: "todos os indicadores da apostila, com fórmula, origem, frequência, meta e semáforo, e o que falta lançar para cada um que estiver sem dado" },
  { href: "/leitura/canais", nome: "Canais", ritual: "sob demanda", conteudo: "tabela de margem por canal com parâmetros editáveis, entrega de virada, preço de equivalência" },
];

export default function PaginaLeitura() {
  return (
    <>
      <Titulo sub="Organizado pelo momento em que a pessoa lê, não por módulo">Leitura</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TELAS.map((t) => (
          <Link key={t.href} href={t.href} className="block border border-cinza-claro bg-branco p-4 hover:border-preto">
            <div className="text-base font-semibold">{t.nome}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-cinza-escuro">{t.ritual}</div>
            <div className="mt-2 text-sm text-cinza-escuro">{t.conteudo}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
