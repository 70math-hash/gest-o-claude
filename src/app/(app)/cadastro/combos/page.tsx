import { listarCombos } from "@/lib/dados/cadastro_detalhe";
import { listarProdutosAtivos } from "@/lib/dados/cadastro";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { alternarCombo, salvarCombo } from "../acoes";

export const metadata = { title: "Combos 2x1" };

export default async function PaginaCombos() {
  const [combos, produtos] = await Promise.all([listarCombos(), listarProdutosAtivos()]);
  const pizzas = produtos.filter((p) => p.bloco === "pizza");
  return (
    <>
      <Titulo sub="Combo fixo identifica a gratuita no dia com 2x1; combo livre é identificado por desconto de 100% na linha.">Combos 2x1</Titulo>
      <Secao titulo="Novo combo">
        <Formulario acao={salvarCombo} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Gratuita"><select name="produto_gratuito_id" className="campo" required><option value="">escolha</option>{pizzas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
          <Campo rotulo="Paga"><select name="produto_pago_id" className="campo" required><option value="">escolha</option>{pizzas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Combos">
        <Tabela cabecalho={[{ rotulo: "Gratuita" }, { rotulo: "Paga" }, { rotulo: "Situação" }, { rotulo: "" }]}>
          {combos.map((c) => (
            <tr key={c.id} className={c.ativo ? "" : "text-cinza"}>
              <Td>{c.gratuito}</Td>
              <Td>{c.pago}</Td>
              <Td>{c.ativo ? "ativo" : "inativo"}</Td>
              <Td><form action={alternarCombo.bind(null, c.id, !c.ativo)}><button className="text-xs underline">{c.ativo ? "desativar" : "ativar"}</button></form></Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
