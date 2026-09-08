import { formatarDataIso } from "@/formato";
import { listarProcessos } from "@/lib/dados/cadastro";
import { Campo, Secao, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarProcesso } from "../acoes";

export const metadata = { title: "Processos críticos" };

export default async function PaginaProcessos() {
  const processos = await listarProcessos();
  return (
    <>
      <Titulo sub="POP em arquivo com versão · cobertura_pop = processos com POP testado / processos críticos">Processos críticos</Titulo>
      <Secao titulo="Novo processo">
        <Formulario acao={salvarProcesso} rotuloBotao="Cadastrar" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
          <Campo rotulo="Praça"><input name="praca" className="campo" /></Campo>
          <Campo rotulo="POP (URL do arquivo)"><input name="pop_url" className="campo" /></Campo>
          <Campo rotulo="Versão do POP"><input name="pop_versao" className="campo" /></Campo>
          <Campo rotulo="POP testado em"><input type="date" name="pop_testado_em" className="campo" /></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Processos">
        <div className="space-y-2">
          {processos.map((p) => (
            <Formulario key={p.id} acao={salvarProcesso} rotuloBotao="Salvar" className="grid gap-2 border border-cinza-claro bg-branco p-3 sm:grid-cols-6">
              <input type="hidden" name="id" value={p.id} />
              <Campo rotulo="Nome"><input name="nome" className="campo py-1" defaultValue={p.nome} /></Campo>
              <Campo rotulo="Praça"><input name="praca" className="campo py-1" defaultValue={p.praca ?? ""} /></Campo>
              <Campo rotulo="POP (URL)"><input name="pop_url" className="campo py-1" defaultValue={p.popUrl ?? ""} /></Campo>
              <Campo rotulo="Versão"><input name="pop_versao" className="campo py-1" defaultValue={p.popVersao ?? ""} /></Campo>
              <Campo rotulo="Testado em"><input type="date" name="pop_testado_em" className="campo py-1" defaultValue={p.popTestadoEm ?? ""} /></Campo>
              <div className="self-end text-xs text-cinza-escuro">{p.popTestadoEm ? `testado ${formatarDataIso(p.popTestadoEm)}` : "sem teste registrado"}</div>
            </Formulario>
          ))}
        </div>
      </Secao>
    </>
  );
}
