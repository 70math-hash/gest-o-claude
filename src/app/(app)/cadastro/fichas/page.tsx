import Link from "next/link";
import { formatarMoeda, formatarPercentual, formatarPontos, hojeIso } from "@/formato";
import { cmvTeoricoItens } from "@/lib/dados/leitura";
import { Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";

export const metadata = { title: "Fichas técnicas" };

export default async function PaginaFichas() {
  const itens = await cmvTeoricoItens(hojeIso());
  const comFicha = itens.filter((i) => i.origemCusto === "ficha").length;
  return (
    <>
      <Titulo sub={`${comFicha} produtos com ficha · ${itens.filter((i) => i.origemCusto === "referencia").length} com custo de referência · ${itens.filter((i) => i.custo === null).length} sem custo`}>Fichas técnicas</Titulo>
      <Secao titulo="Custo e os dois CMV" descricao="cmv_teorico = custo_ficha / preco · cmv_altec sem rendimento, só para comparar · distorção acima de 3 pontos é alerta">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Produto" }, { rotulo: "Bloco" }, { rotulo: "Preço", num: true }, { rotulo: "Custo real", num: true }, { rotulo: "Custo Altec", num: true }, { rotulo: "CMV real", num: true }, { rotulo: "CMV Altec", num: true }, { rotulo: "Distorção", num: true }, { rotulo: "Origem" }]}>
          {itens.map((i) => (
            <tr key={i.produtoId}>
              <Td><Semaforo nivel={i.cmv === null ? null : i.critico ? "critico" : i.acimaDaMeta ? "alerta" : i.alertaDistorcao ? "atencao" : "otimo"} /></Td>
              <Td><Link href={`/cadastro/fichas/${i.produtoId}`} className="underline">{i.nome}</Link></Td>
              <Td>{i.bloco}</Td>
              <Td num>{formatarMoeda(i.preco)}</Td>
              <Td num>{formatarMoeda(i.custo)}</Td>
              <Td num>{formatarMoeda(i.custoAltec)}</Td>
              <Td num>{formatarPercentual(i.cmv)}</Td>
              <Td num>{formatarPercentual(i.cmvAltec)}</Td>
              <Td num>{i.distorcao === null ? "" : `${formatarPontos(i.distorcao)}${i.alertaDistorcao && i.insumoDistorcao ? ` (${i.insumoDistorcao})` : ""}`}</Td>
              <Td className="text-xs text-cinza-escuro">{i.origemCusto === "ficha" ? "ficha" : i.origemCusto === "referencia" ? "referência (sem ficha)" : i.faltas.join("; ")}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
