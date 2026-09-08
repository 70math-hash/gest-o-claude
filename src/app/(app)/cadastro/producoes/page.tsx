import Link from "next/link";
import { formatarDataIso, formatarMoeda, formatarNumero, formatarPercentual } from "@/formato";
import { producoesComCusto } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarProducao } from "../acoes";

export const metadata = { title: "Produções" };

export default async function PaginaProducoes() {
  const producoes = await producoesComCusto();
  const pendentes = producoes.filter((p) => p.rendimento === null).length;
  return (
    <>
      <Titulo sub={`${producoes.length} produções intermediárias · ${pendentes} com batelada pendente de rendimento`}>Produções</Titulo>
      <Secao titulo="Nova produção" descricao="Rendimento de batelada obrigatório: cadastro sem rendimento não salva.">
        <Formulario acao={salvarProducao} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Código Altec"><input name="codigo_altec" className="campo" /></Campo>
          <Campo rotulo="Unidade do rendimento"><select name="unidade_rendimento" className="campo"><option value="kg">kg</option><option value="l">L</option><option value="un">un</option></select></Campo>
          <Campo rotulo="Rendimento da batelada"><input name="rendimento_declarado" className="campo num" inputMode="decimal" required placeholder="2,2" /></Campo>
          <Campo rotulo="Rendimento de uso (%)" ajuda="perda ao usar no prato; 100 se não houver"><input name="rendimento_uso" className="campo num" inputMode="decimal" defaultValue="100" /></Campo>
          <Campo rotulo="Custo por unidade (opcional)" ajuda="até cadastrar a batelada"><input name="custo_por_unidade" className="campo num" inputMode="decimal" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Produções">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Produção" }, { rotulo: "Código" }, { rotulo: "Rendimento", num: true }, { rotulo: "Uso", num: true }, { rotulo: "Custo vigente", num: true }, { rotulo: "Origem" }, { rotulo: "Desde" }]}>
          {producoes.map((p) => (
            <tr key={p.id} className={p.ativo ? "" : "text-cinza"}>
              <Td><Semaforo nivel={p.rendimento === null ? "alerta" : p.custo === null ? "critico" : "otimo"} /></Td>
              <Td>
                <Link href={`/cadastro/producoes/${p.id}`} className="underline">{p.nome}</Link>
                {p.observacao && <div className="text-xs text-cinza-escuro">{p.observacao}</div>}
              </Td>
              <Td>{p.codigoAltec ?? ""}</Td>
              <Td num>{p.rendimento === null ? "pendente" : `${formatarNumero(p.rendimento, 3, 0)} ${p.unidade}`}</Td>
              <Td num>{formatarPercentual(p.rendimentoUso, 0)}</Td>
              <Td num>{p.custo === null ? "sem dado" : `${formatarMoeda(p.custo)}/${p.unidade}`}</Td>
              <Td>{p.origem ?? ""}</Td>
              <Td>{formatarDataIso(p.desde)}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
