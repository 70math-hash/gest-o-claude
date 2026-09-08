import Link from "next/link";
import { sessaoAtual, podeGerir } from "@/lib/sessao";
import { Titulo } from "@/componentes/ui";

export const metadata = { title: "Cadastro" };

const GRUPOS = [
  { titulo: "Produto", itens: [["/cadastro/insumos", "Insumos", "histórico de preço e rendimento, fornecedores homologados"], ["/cadastro/producoes", "Produções", "rendimento de batelada e custo por quilo"], ["/cadastro/fichas", "Fichas técnicas", "versões, diferença de custo e CMV, foto do padrão"], ["/cadastro/produtos", "Produtos", "preço com vigência, seção, piso e teto"], ["/cadastro/metas", "Metas de CMV", "meta é teto, não alvo"], ["/cadastro/combos", "Combos 2x1", "gratuita e paga"]] },
  { titulo: "Casa", itens: [["/cadastro/parametros", "Parâmetros", "cadeiras, mesas, dias, taxa de serviço, imposto (Simples), forno"], ["/cadastro/canais", "Canais", "comissão, taxa, embalagem, entrega e mensalidade com vigência"], ["/cadastro/plano-contas", "Plano de contas", "grupo, natureza, dono e linha do DRE"], ["/cadastro/orcamento", "Orçamento", "valores por linha do DRE e lucro alvo"], ["/cadastro/caixa", "Caixa 13 semanas", "projeção rolante"], ["/cadastro/fornecedores", "Fornecedores", "homologação e prazo de entrega"]] },
  { titulo: "Gente e processo", itens: [["/cadastro/colaboradores", "Colaboradores e folha", "admissão, desligamento, salário, folha mensal"], ["/cadastro/escalas", "Escalas", "previsto e realizado"], ["/cadastro/processos", "Processos críticos", "POP em arquivo com versão"], ["/cadastro/certificacoes", "Certificações", "matriz de polivalência"], ["/cadastro/cronograma", "Cronograma modelo", "etapas do dia por praça"], ["/cadastro/checklists", "Checklists modelo", "abertura e fechamento por praça"], ["/captura/documento", "Documentos de risco", "calendário de vencimentos"]] },
  { titulo: "Acesso", itens: [["/cadastro/usuarios", "Usuários", "e-mails autorizados e perfis"]] },
] as const;

export default async function PaginaCadastro() {
  const sessao = await sessaoAtual();
  const gestao = podeGerir(sessao.perfil);
  return (
    <>
      <Titulo sub={gestao ? "Tudo temporal: preço, ficha, meta e canal ganham vigência nova, nunca são sobrescritos" : "Consulta. Alterações são do dono e do gestor."}>Cadastro</Titulo>
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="mb-8">
          <h2 className="mb-3 border-b border-preto pb-2 text-base font-semibold uppercase tracking-wider">{g.titulo}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.itens.map(([href, nome, descricao]) => (
              <Link key={href} href={href} className="block border border-cinza-claro bg-branco p-4 hover:border-preto">
                <div className="font-semibold">{nome}</div>
                <div className="mt-1 text-sm text-cinza-escuro">{descricao}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
