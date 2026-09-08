import { formatarDataIso, formatarPercentual, hojeIso } from "@/formato";
import { listarMetas } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarMeta } from "../acoes";

export const metadata = { title: "Metas de CMV" };

export default async function PaginaMetas() {
  const metas = await listarMetas();
  return (
    <>
      <Titulo sub="Meta de CMV é teto, não alvo. Um bloco operar abaixo da meta é ótimo; o sistema nunca sugere subir custo.">Metas de CMV</Titulo>
      <Secao titulo="Nova vigência de meta">
        <Formulario acao={salvarMeta} rotuloBotao="Gravar meta" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Bloco"><select name="bloco" className="campo">{["pizza", "entrada", "sobremesa", "bar", "salao", "casa"].map((b) => <option key={b} value={b}>{b}</option>)}</select></Campo>
          <Campo rotulo="Meta (%)"><input name="meta" className="campo num" inputMode="decimal" required placeholder="23" /></Campo>
          <Campo rotulo="Teto (%)"><input name="teto" className="campo num" inputMode="decimal" placeholder="25" /></Campo>
          <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
          <Campo rotulo="Observação"><input name="observacao" className="campo" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Metas">
        <Tabela cabecalho={[{ rotulo: "Bloco" }, { rotulo: "Meta", num: true }, { rotulo: "Teto", num: true }, { rotulo: "Vigência" }, { rotulo: "Observação" }]}>
          {metas.map((m) => (
            <tr key={m.id} className={m.fim === null ? "font-semibold" : "text-cinza"}>
              <Td>{m.bloco}</Td>
              <Td num>{formatarPercentual(m.meta, 0)}</Td>
              <Td num>{m.teto === null ? "—" : formatarPercentual(m.teto, 0)}</Td>
              <Td>{formatarDataIso(m.inicio)} {m.fim ? `a ${formatarDataIso(m.fim)}` : "(vigente)"}</Td>
              <Td className="text-xs">{m.observacao ?? ""}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
