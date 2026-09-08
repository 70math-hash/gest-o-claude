import { listarFornecedores } from "@/lib/dados/cadastro";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { alternarHomologacao, salvarFornecedor } from "../acoes";

export const metadata = { title: "Fornecedores" };

export default async function PaginaFornecedores() {
  const fornecedores = await listarFornecedores();
  return (
    <>
      <Titulo sub="Item classe A exige 2 fornecedores homologados · prazo de entrega alimenta o ponto de pedido">Fornecedores</Titulo>
      <Secao titulo="Novo fornecedor">
        <Formulario acao={salvarFornecedor} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="CNPJ"><input name="cnpj" className="campo" /></Campo>
          <Campo rotulo="Contato"><input name="contato" className="campo" /></Campo>
          <Campo rotulo="Prazo de entrega (dias)"><input name="prazo_entrega_dias" className="campo num" inputMode="numeric" defaultValue="1" /></Campo>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="homologado" /> homologado</label>
        </Formulario>
      </Secao>
      <Secao titulo="Fornecedores">
        <Tabela cabecalho={[{ rotulo: "Nome" }, { rotulo: "CNPJ" }, { rotulo: "Contato" }, { rotulo: "Prazo", num: true }, { rotulo: "Homologado" }, { rotulo: "" }]} vazio={fornecedores.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhum fornecedor cadastrado</div> : null}>
          {fornecedores.map((f) => (
            <tr key={f.id}>
              <Td>{f.nome}</Td><Td className="num">{f.cnpj ?? ""}</Td><Td>{f.contato ?? ""}</Td><Td num>{f.prazo}</Td><Td>{f.homologado ? "sim" : "não"}</Td>
              <Td><form action={alternarHomologacao.bind(null, f.id, !f.homologado)}><button className="text-xs underline">{f.homologado ? "retirar homologação" : "homologar"}</button></form></Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
