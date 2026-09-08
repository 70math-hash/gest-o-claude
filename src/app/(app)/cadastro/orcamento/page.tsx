import { hojeIso, formatarCompetencia } from "@/formato";
import { listarOrcamento } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarOrcamento } from "../acoes";

export const metadata = { title: "Orçamento" };

const LINHAS: Array<[string, string]> = [["receita_bruta", "Receita bruta"], ["impostos", "Impostos"], ["taxas_pagamento", "Taxas de pagamento"], ["comissoes_marketplace", "Comissões de marketplace"], ["cmv", "CMV"], ["embalagem", "Embalagem"], ["folha", "Folha com encargos"], ["ocupacao", "Ocupação"], ["utilidades", "Utilidades"], ["operacional", "Operacional"], ["marketing", "Marketing"], ["financeiro", "Financeiro"], ["lucro_alvo", "Lucro alvo (ponto de equilíbrio)"]];

export default async function PaginaOrcamento({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const competencia = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hojeIso().slice(0, 7);
  const linhas = await listarOrcamento(`${competencia}-01`);
  const valor = (l: string) => linhas.find((x) => x.linha === l)?.valor;
  return (
    <>
      <Titulo sub={`${formatarCompetencia(`${competencia}-01`)} · valores em R$ por linha do DRE; o desvio aparece no fechamento do mês`}>Orçamento</Titulo>
      <form className="mb-4 flex items-center gap-2 text-sm">
        <input type="month" name="mes" defaultValue={competencia} className="campo w-auto py-1" />
        <button className="botao-secundario py-1">Trocar mês</button>
      </form>
      <Secao titulo="Linhas">
        <Formulario acao={salvarOrcamento} rotuloBotao="Salvar orçamento" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <input type="hidden" name="competencia" value={competencia} />
          {LINHAS.map(([codigo, nome]) => (
            <Campo key={codigo} rotulo={nome}><input name={codigo} className="campo num" inputMode="decimal" defaultValue={valor(codigo) !== undefined ? String(valor(codigo)).replace(".", ",") : ""} /></Campo>
          ))}
        </Formulario>
      </Secao>
    </>
  );
}
