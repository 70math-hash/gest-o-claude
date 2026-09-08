import { formatarDataIso, formatarMoeda, hojeIso, semanaOperacional } from "@/formato";
import { caixaCompleto } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarCaixa } from "../acoes";

export const metadata = { title: "Caixa 13 semanas" };

export default async function PaginaCaixa() {
  const semanas = await caixaCompleto();
  const proxima = semanaOperacional(hojeIso()).inicio;
  return (
    <>
      <Titulo sub="ncg = estoque + contas a receber − contas a pagar · projeção rolante de 13 semanas">Caixa 13 semanas</Titulo>
      <Secao titulo="Semana">
        <Formulario acao={salvarCaixa} rotuloBotao="Salvar semana" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Início da semana (terça)"><input type="date" name="semana_inicio" className="campo" defaultValue={proxima} required /></Campo>
          <Campo rotulo="Saldo inicial"><input name="saldo_inicial" className="campo num" inputMode="decimal" /></Campo>
          <Campo rotulo="Entradas previstas"><input name="entradas_previstas" className="campo num" inputMode="decimal" /></Campo>
          <Campo rotulo="Saídas previstas"><input name="saidas_previstas" className="campo num" inputMode="decimal" /></Campo>
          <Campo rotulo="Observação"><input name="observacao" className="campo" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Projeção">
        <Tabela cabecalho={[{ rotulo: "Semana" }, { rotulo: "Saldo inicial", num: true }, { rotulo: "Entradas", num: true }, { rotulo: "Saídas", num: true }, { rotulo: "Saldo projetado", num: true }, { rotulo: "Observação" }]} vazio={semanas.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhuma semana projetada</div> : null}>
          {semanas.map((s) => (
            <tr key={s.id}>
              <Td>{formatarDataIso(s.semana)}</Td><Td num>{formatarMoeda(s.saldoInicial)}</Td><Td num>{formatarMoeda(s.entradas)}</Td><Td num>{formatarMoeda(s.saidas)}</Td><Td num>{formatarMoeda(s.saldoProjetado)}</Td><Td>{s.observacao ?? ""}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
