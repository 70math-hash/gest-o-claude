import { formatarDataIso, formatarMoeda, formatarPercentual, hojeIso } from "@/formato";
import { canaisComParametros } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { novoParametroCanal, salvarCanal } from "../acoes";

export const metadata = { title: "Canais" };

export default async function PaginaCanais() {
  const canais = await canaisComParametros();
  return (
    <>
      <Titulo sub="comissão, taxa de pagamento, embalagem, custo de entrega e mensalidade, com vigência">Canais</Titulo>
      <Secao titulo="Parâmetros vigentes">
        <Tabela cabecalho={[{ rotulo: "Canal" }, { rotulo: "Tipo" }, { rotulo: "Entrega" }, { rotulo: "Comissão", num: true }, { rotulo: "Taxa pagamento", num: true }, { rotulo: "Embalagem", num: true }, { rotulo: "Entrega R$", num: true }, { rotulo: "Mensalidade", num: true }, { rotulo: "Desde" }]}>
          {canais.map((c) => (
            <tr key={c.id} className={c.ativo ? "" : "text-cinza"}>
              <Td>{c.nome}</Td><Td>{c.tipo}</Td><Td>{c.entregaPor}</Td>
              <Td num>{c.comissao === null ? "sem dado" : formatarPercentual(c.comissao)}</Td>
              <Td num>{c.taxa === null ? "sem dado" : formatarPercentual(c.taxa)}</Td>
              <Td num>{formatarMoeda(c.embalagem)}</Td><Td num>{formatarMoeda(c.entrega)}</Td><Td num>{formatarMoeda(c.mensalidade)}</Td>
              <Td>{formatarDataIso(c.desde)}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Nova vigência de parâmetros">
          <Formulario acao={novoParametroCanal} rotuloBotao="Gravar" className="grid grid-cols-2 gap-3">
            <Campo rotulo="Canal"><select name="canal_id" className="campo" required>{canais.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
            <Campo rotulo="Vigência desde"><input type="date" name="vigencia_inicio" className="campo" defaultValue={hojeIso()} /></Campo>
            <Campo rotulo="Comissão (%)"><input name="comissao" className="campo num" inputMode="decimal" /></Campo>
            <Campo rotulo="Taxa de pagamento (%)"><input name="taxa_pagamento" className="campo num" inputMode="decimal" /></Campo>
            <Campo rotulo="Embalagem (R$)"><input name="embalagem" className="campo num" inputMode="decimal" defaultValue="3,00" /></Campo>
            <Campo rotulo="Entrega paga pela casa (R$)"><input name="entrega" className="campo num" inputMode="decimal" defaultValue="0" /></Campo>
            <Campo rotulo="Mensalidade (R$)"><input name="mensalidade" className="campo num" inputMode="decimal" defaultValue="0" /></Campo>
          </Formulario>
        </Secao>
        <Secao titulo="Novo canal">
          <Formulario acao={salvarCanal} rotuloBotao="Cadastrar" className="grid grid-cols-2 gap-3">
            <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
            <Campo rotulo="Tipo"><select name="tipo" className="campo"><option value="marketplace">marketplace</option><option value="proprio">próprio</option><option value="salao">salão</option></select></Campo>
            <Campo rotulo="Quem entrega"><select name="entrega_por" className="campo"><option value="plataforma">plataforma</option><option value="casa">casa</option><option value="nenhuma">nenhuma</option></select></Campo>
            <Campo rotulo="Ordem"><input name="ordem" className="campo num" inputMode="numeric" defaultValue="99" /></Campo>
          </Formulario>
        </Secao>
      </div>
    </>
  );
}
