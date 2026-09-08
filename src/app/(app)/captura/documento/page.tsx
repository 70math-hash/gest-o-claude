import { formatarDataIso, hojeIso } from "@/formato";
import { documentosRisco } from "@/lib/dados/captura";
import { listarColaboradores } from "@/lib/dados/cadastro";
import { Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarDocumento } from "./acoes";

export const metadata = { title: "Documento de risco" };

export default async function PaginaDocumento() {
  const [documentos, colaboradores] = await Promise.all([documentosRisco(), listarColaboradores()]);
  const hoje = new Date(`${hojeIso()}T12:00:00-03:00`).getTime();
  return (
    <>
      <Titulo sub="1 minuto · alerta em 60 dias ou menos; vencido é destaque permanente">Documento de risco</Titulo>
      <Formulario acao={salvarDocumento} rotuloBotao="Salvar documento" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Campo rotulo="Nome"><input name="nome" className="campo" required /></Campo>
        <Campo rotulo="Tipo"><input name="tipo" className="campo" required placeholder="alvará, AVCB, vigilância, contrato..." /></Campo>
        <Campo rotulo="Vencimento"><input type="date" name="vencimento" className="campo" required /></Campo>
        <Campo rotulo="Responsável">
          <select name="responsavel_id" className="campo">
            <option value="">—</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Alerta (dias)"><input name="alerta_dias" className="campo num" inputMode="numeric" defaultValue="60" /></Campo>
      </Formulario>
      <div className="mt-8" />
      <Secao titulo="Calendário de risco">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Documento" }, { rotulo: "Tipo" }, { rotulo: "Vencimento" }, { rotulo: "Dias", num: true }, { rotulo: "Responsável" }]} vazio={documentos.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhum documento cadastrado</div> : null}>
          {documentos.map((d) => {
            const dias = Math.floor((new Date(`${d.vencimento}T12:00:00-03:00`).getTime() - hoje) / 86_400_000);
            const nivel = dias < 0 ? "critico" : dias <= d.alertaDias ? "alerta" : "otimo";
            return (
              <tr key={d.id}>
                <Td><Semaforo nivel={nivel} /></Td>
                <Td>{d.nome}</Td>
                <Td>{d.tipo}</Td>
                <Td>{formatarDataIso(d.vencimento)}</Td>
                <Td num>{dias < 0 ? `vencido há ${-dias}` : dias}</Td>
                <Td>{d.responsavel ?? "—"}</Td>
              </tr>
            );
          })}
        </Tabela>
      </Secao>
    </>
  );
}
