import { formatarDataIso, formatarInteiro, hojeIso } from "@/formato";
import { insumosParaContagem, inventariosRecentes } from "@/lib/dados/captura";
import { Aviso, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { FormularioContagem } from "./formulario";

export const metadata = { title: "Contagem" };

export default async function PaginaContagem({ searchParams }: { searchParams: Promise<{ data?: string; tipo?: string; base?: string }> }) {
  const p = await searchParams;
  const data = p.data && /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? p.data : hojeIso();
  const tipo = p.tipo === "geral" ? "geral" : "rotativo";
  const base = p.base === "bar" ? "bar" : "cozinha";
  const [insumos, recentes] = await Promise.all([insumosParaContagem(base, tipo === "rotativo", data), inventariosRecentes()]);
  return (
    <>
      <Titulo sub={tipo === "rotativo" ? "rotativo semanal dos itens classe A · 15 minutos" : "geral mensal · 60 minutos"}>Contagem</Titulo>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["rotativo", "geral"] as const).map((t) => (
          <a key={t} href={`?data=${data}&tipo=${t}&base=${base}`} className={`px-3 py-1 ${tipo === t ? "bg-preto text-papel" : "border border-preto"}`}>{t}</a>
        ))}
        {(["cozinha", "bar"] as const).map((b) => (
          <a key={b} href={`?data=${data}&tipo=${tipo}&base=${b}`} className={`px-3 py-1 ${base === b ? "bg-preto text-papel" : "border border-preto"}`}>{b}</a>
        ))}
      </div>
      {insumos.length === 0 && <Aviso nivel="info">{tipo === "rotativo" ? "Nenhum insumo classe A nesta base. A curva ABC é recalculada por rotina semestral a partir das compras; até lá, classifique em Cadastro › Insumos." : "Nenhum insumo ativo nesta base."}</Aviso>}
      {insumos.length > 0 && <FormularioContagem data={data} tipo={tipo} base={base} insumos={insumos} />}
      <div className="mt-8" />
      <Secao titulo="Inventários recentes">
        <Tabela cabecalho={[{ rotulo: "Data" }, { rotulo: "Tipo" }, { rotulo: "Base" }, { rotulo: "Itens", num: true }, { rotulo: "Situação" }]} vazio={recentes.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhum inventário lançado</div> : null}>
          {recentes.map((i) => (
            <tr key={i.id}>
              <Td>{formatarDataIso(i.data)}</Td>
              <Td>{i.tipo}</Td>
              <Td>{i.base}</Td>
              <Td num>{formatarInteiro(i.itens)}</Td>
              <Td>{i.fechado ? "fechado" : "aberto"}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
