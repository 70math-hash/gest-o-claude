import Link from "next/link";
import { formatarDataIso, formatarMoeda, formatarPercentual, hojeIso } from "@/formato";
import { insumosComPreco } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarInsumo } from "../acoes";

export const metadata = { title: "Insumos" };

export default async function PaginaInsumos() {
  const insumos = await insumosComPreco();
  const semPreco = insumos.filter((i) => i.ativo && i.preco === null).length;
  return (
    <>
      <Titulo sub={`${insumos.length} insumos · ${semPreco} sem preço vigente`}>Insumos</Titulo>
      <Secao titulo="Novo insumo" descricao="Cadastro sem preço e rendimento não salva (regra 3). Rendimento de 1% a 100%.">
        <Formulario acao={salvarInsumo} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Categoria"><input name="categoria" className="campo" placeholder="Queijos, Hortifruti..." /></Campo>
          <Campo rotulo="Base">
            <select name="base" className="campo"><option value="cozinha">cozinha</option><option value="bar">bar</option></select>
          </Campo>
          <Campo rotulo="Unidade de uso">
            <select name="unidade_uso" className="campo"><option value="kg">kg</option><option value="l">L</option><option value="un">un</option></select>
          </Campo>
          <Campo rotulo="Preço por unidade de uso"><input name="preco" className="campo num" inputMode="decimal" required /></Campo>
          <Campo rotulo="Rendimento (%)"><input name="rendimento" className="campo num" inputMode="decimal" required placeholder="88" /></Campo>
          <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
          <Campo rotulo="Curva ABC">
            <select name="curva_abc" className="campo"><option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
          </Campo>
          <Campo rotulo="Origem do preço">
            <select name="origem" className="campo"><option value="cotacao">cotação</option><option value="nota">nota</option><option value="manual">manual</option></select>
          </Campo>
          <Campo rotulo="Código no Altec"><input name="codigo_altec" className="campo" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Insumos" descricao="Classe A com menos de 2 fornecedores homologados é alerta.">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Insumo" }, { rotulo: "Categoria" }, { rotulo: "Base" }, { rotulo: "Classe" }, { rotulo: "Preço vigente", num: true }, { rotulo: "Rendimento", num: true }, { rotulo: "Custo efetivo", num: true }, { rotulo: "Desde" }, { rotulo: "Homologados", num: true }]}>
          {insumos.map((i) => (
            <tr key={i.id} className={i.ativo ? "" : "text-cinza"}>
              <Td><Semaforo nivel={i.preco === null ? "critico" : i.curva === "A" && i.homologados < 2 ? "alerta" : "otimo"} /></Td>
              <Td><Link href={`/cadastro/insumos/${i.id}`} className="underline">{i.nome}</Link>{!i.ativo && " (inativo)"}</Td>
              <Td>{i.categoria ?? ""}</Td>
              <Td>{i.base}</Td>
              <Td>{i.curva ?? "—"}</Td>
              <Td num>{i.preco === null ? "sem dado" : `${formatarMoeda(i.preco)}/${i.unidade}`}</Td>
              <Td num>{formatarPercentual(i.rendimento, 0)}</Td>
              <Td num>{i.preco !== null && i.rendimento ? formatarMoeda(i.preco / i.rendimento) : "sem dado"}</Td>
              <Td>{formatarDataIso(i.desde)}</Td>
              <Td num>{i.homologados}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
