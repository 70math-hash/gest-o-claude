import { checklistModelo } from "@/lib/dados/captura";
import { Campo, Secao, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarChecklistModelo } from "../acoes";

export const metadata = { title: "Checklists modelo" };

export default async function PaginaChecklistsModelo() {
  const modelos = await checklistModelo();
  return (
    <>
      <Titulo sub="um item por linha · abertura e fechamento por praça">Checklists modelo</Titulo>
      <div className="grid gap-4 lg:grid-cols-2">
        {modelos.map((m) => (
          <Secao key={`${m.praca}-${m.tipo}`} titulo={`${m.praca} · ${m.tipo}`}>
            <Formulario acao={salvarChecklistModelo} rotuloBotao="Salvar">
              <input type="hidden" name="praca" value={m.praca} />
              <input type="hidden" name="tipo" value={m.tipo} />
              <textarea name="itens" className="campo" rows={7} defaultValue={m.itens.join("\n")} />
            </Formulario>
          </Secao>
        ))}
      </div>
      <Secao titulo="Novo checklist">
        <Formulario acao={salvarChecklistModelo} rotuloBotao="Criar" className="grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Praça"><input name="praca" className="campo" required placeholder="cozinha, bar, salao, massa..." /></Campo>
          <Campo rotulo="Tipo"><select name="tipo" className="campo"><option value="abertura">abertura</option><option value="fechamento">fechamento</option></select></Campo>
          <Campo rotulo="Itens (um por linha)"><textarea name="itens" className="campo" rows={4} /></Campo>
        </Formulario>
      </Secao>
    </>
  );
}
