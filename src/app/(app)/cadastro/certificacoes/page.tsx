import { formatarDataIso, hojeIso } from "@/formato";
import { listarCertificacoes } from "@/lib/dados/cadastro_detalhe";
import { matrizPolivalencia } from "@/lib/dados/leitura";
import { listarColaboradores, listarProcessos } from "@/lib/dados/cadastro";
import { Aviso, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarCertificacao } from "../acoes";

export const metadata = { title: "Certificações" };

export default async function PaginaCertificacoes() {
  const [certificacoes, matriz, colaboradores, processos] = await Promise.all([listarCertificacoes(), matrizPolivalencia(), listarColaboradores(), listarProcessos()]);
  return (
    <>
      <Titulo sub="nível 1 a 4 por processo crítico · redundância = certificados nível ≥ 2 por processo, mínimo 2">Certificações e matriz de polivalência</Titulo>
      <Secao titulo="Nova certificação">
        <Formulario acao={salvarCertificacao} rotuloBotao="Lançar" className="grid gap-3 sm:grid-cols-5">
          <Campo rotulo="Colaborador"><select name="colaborador_id" className="campo" required><option value="">escolha</option>{colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
          <Campo rotulo="Processo"><select name="processo_id" className="campo" required><option value="">escolha</option>{processos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
          <Campo rotulo="Nível"><select name="nivel" className="campo">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></Campo>
          <Campo rotulo="Data"><input type="date" name="data" className="campo" defaultValue={hojeIso()} required /></Campo>
          <Campo rotulo="Avaliador"><select name="avaliador_id" className="campo"><option value="">—</option>{colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        </Formulario>
      </Secao>
      <Secao titulo="Matriz de polivalência">
        {matriz.colaboradores.length === 0 || matriz.processos.length === 0 ? (
          <Aviso nivel="info">sem dado: cadastre colaboradores e processos críticos.</Aviso>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Colaborador</th>{matriz.processos.map((p) => <th key={p.id} className="num">{p.nome}</th>)}</tr></thead>
              <tbody>
                {matriz.colaboradores.map((c) => (
                  <tr key={c.id}><td>{c.nome}</td>{matriz.processos.map((p) => <td key={p.id} className="num">{matriz.nivel(c.id, p.id) ?? "—"}</td>)}</tr>
                ))}
                <tr className="font-semibold"><td>Nível ≥ 2</td>{matriz.processos.map((p) => { const n = matriz.certificadosNivel2(p.id); return <td key={p.id} className="num">{n}{n < 2 ? " ▲" : ""}</td>; })}</tr>
              </tbody>
            </table>
          </div>
        )}
      </Secao>
      <Secao titulo="Últimas certificações">
        <Tabela cabecalho={[{ rotulo: "Data" }, { rotulo: "Colaborador" }, { rotulo: "Processo" }, { rotulo: "Nível", num: true }, { rotulo: "Avaliador" }]} vazio={certificacoes.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">nenhuma certificação lançada</div> : null}>
          {certificacoes.map((c) => (
            <tr key={c.id}><Td>{formatarDataIso(c.data)}</Td><Td>{c.colaborador}</Td><Td>{c.processo}</Td><Td num>{c.nivel}</Td><Td>{c.avaliador || "—"}</Td></tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
