import { listarPlanoContas } from "@/lib/dados/cadastro";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarConta } from "../acoes";

export const metadata = { title: "Plano de contas" };

const LINHAS_DRE = ["impostos", "taxas_pagamento", "comissoes_marketplace", "cmv", "embalagem", "folha", "ocupacao", "utilidades", "operacional", "marketing", "financeiro", "pro_labore", "depreciacao", "investimento", "outros"];

export default async function PaginaPlanoContas() {
  const contas = await listarPlanoContas();
  return (
    <>
      <Titulo sub="Natureza variável, fixa ou semifixa; custos fixos do DRE somam fixo e semifixo. A linha do DRE diz onde a conta entra.">Plano de contas</Titulo>
      <Secao titulo="Nova conta">
        <Formulario acao={salvarConta} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Código"><input name="codigo" className="campo" placeholder="6.08" /></Campo>
          <Campo rotulo="Grupo"><input name="grupo" className="campo" required /></Campo>
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Natureza"><select name="natureza" className="campo"><option value="variavel">variável</option><option value="fixo">fixo</option><option value="semifixo">semifixo</option></select></Campo>
          <Campo rotulo="Dono"><select name="dono" className="campo"><option value="gestor">gestor</option><option value="dono">dono</option></select></Campo>
          <Campo rotulo="Linha do DRE"><select name="linha_dre" className="campo">{LINHAS_DRE.map((l) => <option key={l} value={l}>{l.replace(/_/g, " ")}</option>)}</select></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Contas">
        <Tabela cabecalho={[{ rotulo: "Código" }, { rotulo: "Grupo" }, { rotulo: "Conta" }, { rotulo: "Natureza" }, { rotulo: "Dono" }, { rotulo: "Linha do DRE" }]}>
          {contas.map((c) => (
            <tr key={c.id}>
              <Td className="num">{c.codigo ?? ""}</Td>
              <Td>{c.grupo}</Td>
              <Td>{c.nome}</Td>
              <Td>{c.natureza}</Td>
              <Td>{c.dono}</Td>
              <Td>{c.linhaDre?.replace(/_/g, " ") ?? ""}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
