import { cronogramaModelo } from "@/lib/dados/cadastro_detalhe";
import { Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { removerEtapaModelo, salvarEtapaModelo } from "../acoes";

export const metadata = { title: "Cronograma modelo" };

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function PaginaCronogramaModelo() {
  const etapas = await cronogramaModelo();
  return (
    <>
      <Titulo sub="o cronograma de cada dia é gerado deste modelo; conferido dentro da janela conta para a aderência">Cronograma modelo</Titulo>
      <Secao titulo="Nova etapa">
        <Formulario acao={salvarEtapaModelo} rotuloBotao="Adicionar" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Etapa"><input name="etapa" className="campo" required /></Campo>
          <Campo rotulo="Praça"><input name="praca" className="campo" /></Campo>
          <Campo rotulo="Início"><input type="time" name="hora_inicio" className="campo" required /></Campo>
          <Campo rotulo="Fim"><input type="time" name="hora_fim" className="campo" required /></Campo>
          <Campo rotulo="Ordem"><input name="ordem" className="campo num" inputMode="numeric" defaultValue={String(etapas.length + 1)} /></Campo>
          <div className="flex flex-wrap gap-2 text-sm sm:col-span-5">{DIAS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" name={`dia:${i}`} defaultChecked={i !== 1} /> {d}</label>)}</div>
        </Formulario>
      </Secao>
      <Secao titulo="Etapas">
        <Tabela cabecalho={[{ rotulo: "Ordem", num: true }, { rotulo: "Etapa" }, { rotulo: "Praça" }, { rotulo: "Janela" }, { rotulo: "Dias" }, { rotulo: "" }]}>
          {etapas.map((e) => (
            <tr key={e.id}>
              <Td num>{e.ordem}</Td><Td>{e.etapa}</Td><Td>{e.praca ?? ""}</Td><Td className="num">{e.inicio} às {e.fim}</Td><Td>{e.dias.map((d) => DIAS[d]).join(" ")}</Td>
              <Td><form action={removerEtapaModelo.bind(null, e.id)}><button className="text-xs underline">remover</button></form></Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
