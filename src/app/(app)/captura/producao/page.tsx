import { Suspense } from "react";
import { formatarDataIso, formatarNumero, hojeIso, nomeDiaSemana } from "@/formato";
import { producaoDoDia } from "@/lib/dados/captura";
import { Aviso, Secao, Titulo } from "@/componentes/ui";
import { SeletorData } from "@/componentes/seletor-data";
import { Formulario } from "@/componentes/formulario";
import { salvarProducaoDoDia } from "./acoes";

export const metadata = { title: "Produção do dia" };

export default async function PaginaProducao({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const linhas = await producaoDoDia(data);
  const v = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
  const semSugestao = linhas.filter((l) => l.tipo === "produto" && l.sugerido === null).length;
  return (
    <>
      <Titulo sub={`${nomeDiaSemana(data)}, ${formatarDataIso(data)} · 3 minutos`} acoes={<Suspense><SeletorData data={data} /></Suspense>}>
        Produção do dia
      </Titulo>
      {semSugestao > 0 && (
        <Aviso nivel="info">
          Sugestão (média do mesmo dia da semana nas últimas 8 a 12 semanas × fator de segurança − sobra anterior) ainda sem histórico para {semSugestao} itens. Ela aparece quando houver 8 semanas de R3 importadas.
        </Aviso>
      )}
      <div className="mt-4" />
      <Formulario acao={salvarProducaoDoDia} rotuloBotao="Salvar produção do dia">
        <input type="hidden" name="data" value={data} />
        <Secao titulo="Mapa de mise" descricao="Planejado vem da sugestão; lance produzido e sobra ao fechar.">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Sugerido</th>
                  <th className="num">Planejado</th>
                  <th className="num">Produzido</th>
                  <th className="num">Sobra</th>
                  <th className="num">Refeitos</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.chave}>
                    <td>
                      <div>{l.nome}</div>
                      <div className="text-xs text-cinza-escuro">{l.tipo === "producao" ? "produção intermediária" : ""}</div>
                    </td>
                    <td className="num">{l.sugerido === null ? <span className="text-cinza" title={l.faltaSugestao ?? undefined}>sem dado</span> : formatarNumero(l.sugerido, 1, 0)}</td>
                    <td className="num"><input name={`planejado:${l.chave}`} className="campo num w-20 py-1" inputMode="decimal" defaultValue={v(l.planejado ?? (l.sugerido !== null ? Math.ceil(l.sugerido) : null))} /></td>
                    <td className="num"><input name={`produzido:${l.chave}`} className="campo num w-20 py-1" inputMode="decimal" defaultValue={v(l.produzido)} /></td>
                    <td className="num"><input name={`sobra:${l.chave}`} className="campo num w-20 py-1" inputMode="decimal" defaultValue={v(l.sobra)} /></td>
                    <td className="num"><input name={`refeitos:${l.chave}`} className="campo num w-20 py-1" inputMode="decimal" defaultValue={v(l.refeitos)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </Formulario>
    </>
  );
}
