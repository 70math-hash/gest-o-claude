import { Suspense } from "react";
import { formatarDataIso, formatarInteiro, formatarMoeda, formatarNumero, formatarPercentual, hojeIso, somarDias } from "@/formato";
import { cmvTeoricoItens, decisoesEngenharia, engenharia, insumosClasseAComImpacto, matrizPolivalencia } from "@/lib/dados/leitura";
import { documentosRisco } from "@/lib/dados/captura";
import { mudancasDeQuadrante, type Quadrante, type ResultadoEngenharia } from "@/motor/engenharia";
import { Aviso, Campo, Secao, Semaforo, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorPeriodo } from "@/componentes/periodo";
import { Formulario } from "@/componentes/formulario";
import { registrarDecisao } from "./acoes";

export const metadata = { title: "Trimestre" };

const QUADRANTE: Record<string, string> = { estrela: "estrela", cavalo_de_batalha: "cavalo de batalha", quebra_cabeca: "quebra-cabeça", abacaxi: "abacaxi" };
const BLOCOS = [
  ["pizza", "Pizzas"],
  ["entrada", "Entradas"],
  ["sobremesa", "Sobremesas"],
] as const;

export default async function PaginaTrimestre({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data: param } = await searchParams;
  const fim = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hojeIso();
  const inicio = somarDias(fim, -89);
  const [itensCusto, insumosA, matriz, documentos, decisoes] = await Promise.all([cmvTeoricoItens(fim), insumosClasseAComImpacto(fim), matrizPolivalencia(), documentosRisco(), decisoesEngenharia()]);
  const porBloco = await Promise.all(
    BLOCOS.map(async ([bloco, nome]) => {
      const [miller, ks] = await Promise.all([engenharia(inicio, fim, bloco, "miller"), engenharia(inicio, fim, bloco, "kasavana_smith")]);
      const paraResultado = (itens: typeof miller, matrizNome: "miller" | "kasavana_smith"): ResultadoEngenharia => ({
        matriz: matrizNome,
        fator: itens[0]?.fator ?? 0.7,
        numeroItens: itens.length,
        unidades: itens[0]?.unidades ?? 0,
        pisoPopularidadeUnidades: itens[0]?.piso ?? 0,
        cmvPonderado: itens[0]?.cmvPonderado ?? null,
        margemMediaPonderada: itens[0]?.margemMedia ?? null,
        itens: itens.map((i) => ({ id: i.produtoId, nome: i.nome, qtde: i.qtde, precoVenda: i.precoMedio ?? 0, custoFicha: i.custo ?? 0, margemContribuicao: i.margem ?? 0, participacao: i.participacao ?? 0, cmv: i.cmv, popularidadeAlta: Boolean(i.popularidadeAlta), margemAlta: Boolean(i.margemAlta), quadrante: (i.quadrante ?? "abacaxi") as Quadrante, margem90d: i.margem90d ?? 0 })),
      });
      const mudancas = miller.length > 0 && ks.every((i) => i.quadrante) ? mudancasDeQuadrante(paraResultado(miller, "miller"), paraResultado(ks, "kasavana_smith")) : [];
      return { bloco, nome, miller, ks, mudancas };
    }),
  );
  const hoje = new Date(`${hojeIso()}T12:00:00-03:00`).getTime();
  const risco90 = documentos.filter((d) => (new Date(`${d.vencimento}T12:00:00-03:00`).getTime() - hoje) / 86_400_000 <= 90);

  return (
    <>
      <Titulo sub="Revisão trimestral · 90 dias de venda" acoes={<Suspense><SeletorPeriodo inicio={inicio} fim={fim} passoDias={90} /></Suspense>}>
        Trimestre
      </Titulo>

      {porBloco.map((b) => (
        <Secao key={b.bloco} titulo={`Engenharia de cardápio · ${b.nome}`} descricao={b.miller[0] ? `${formatarInteiro(b.miller[0].unidades)} unidades em ${b.miller[0].numeroItens} itens · piso de popularidade ${formatarNumero(b.miller[0].piso, 1)} un (fator ${formatarNumero(b.miller[0].fator, 2)}) · CMV ponderado ${formatarPercentual(b.miller[0].cmvPonderado)}` : "sem dado: importação do R3 dos 90 dias"}>
          {b.miller.length > 0 && (
            <Tabela cabecalho={[{ rotulo: "Item" }, { rotulo: "Un", num: true }, { rotulo: "Mix", num: true }, { rotulo: "CMV", num: true }, { rotulo: "MC unit.", num: true }, { rotulo: "MC 90d", num: true }, { rotulo: "Miller" }, { rotulo: "Kasavana-Smith" }]}>
              {b.miller.map((i) => {
                const k = b.ks.find((x) => x.produtoId === i.produtoId);
                return (
                  <tr key={i.produtoId}>
                    <Td>{i.nome}</Td>
                    <Td num>{formatarInteiro(i.qtde)}</Td>
                    <Td num>{formatarPercentual(i.participacao)}</Td>
                    <Td num>{formatarPercentual(i.cmv)}</Td>
                    <Td num>{formatarMoeda(k?.margem ?? null)}</Td>
                    <Td num>{formatarMoeda(k?.margem90d ?? null)}</Td>
                    <Td>{i.quadrante ? QUADRANTE[i.quadrante] : `sem dado (${i.falta})`}</Td>
                    <Td>{k?.quadrante ? QUADRANTE[k.quadrante] : `sem dado (${k?.falta ?? "imposto"})`}</Td>
                  </tr>
                );
              })}
            </Tabela>
          )}
          {b.mudancas.length > 0 && (
            <div className="mt-2 text-sm">
              Mudam de quadrante entre as matrizes: {b.mudancas.map((m) => `${m.nome} (${QUADRANTE[m.de]} → ${QUADRANTE[m.para]})`).join("; ")}.
            </div>
          )}
          {b.miller.length > 0 && (
            <div className="mt-3">
              <Formulario acao={registrarDecisao} rotuloBotao="Registrar decisão" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="bloco" value={b.bloco} />
                <input type="hidden" name="inicio" value={inicio} />
                <input type="hidden" name="fim" value={fim} />
                <Campo rotulo="Matriz usada na decisão">
                  <select name="matriz" className="campo py-1">
                    <option value="miller">Miller (a que a casa usa hoje)</option>
                    <option value="kasavana_smith">Kasavana-Smith (padrão)</option>
                  </select>
                </Campo>
                <Campo rotulo="Decisão"><input name="decisao" className="campo py-1 w-80" placeholder="manter, reformular, reposicionar, descontinuar..." required /></Campo>
              </Formulario>
            </div>
          )}
        </Secao>
      ))}

      {decisoes.length > 0 && (
        <Secao titulo="Histórico de decisões">
          <ul className="space-y-1 text-sm">
            {decisoes.map((d) => (
              <li key={d.id}>
                <span className="num text-cinza-escuro">{formatarDataIso(d.data)}</span> · {d.bloco} · {d.matriz === "miller" ? "Miller" : "Kasavana-Smith"} · {formatarDataIso(d.inicio)} a {formatarDataIso(d.fim)}: {d.decisao}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Recotação dos itens A com impacto nas fichas" descricao="insumos classe A, preço vigente e número de fichas que usam cada um">
        <Tabela cabecalho={[{ rotulo: "Insumo" }, { rotulo: "Preço vigente", num: true }, { rotulo: "Rendimento", num: true }, { rotulo: "Desde" }, { rotulo: "Origem" }, { rotulo: "Fichas", num: true }]} vazio={insumosA.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">sem dado: nenhum insumo classificado como A (curva ABC pelas compras ou Cadastro › Insumos)</div> : null}>
          {insumosA.map((i) => (
            <tr key={i.id}>
              <Td>{i.nome}</Td>
              <Td num>{i.preco === null ? "sem dado" : `${formatarMoeda(i.preco)}/${i.unidade}`}</Td>
              <Td num>{formatarPercentual(i.rendimento, 0)}</Td>
              <Td>{formatarDataIso(i.desde)}</Td>
              <Td>{i.origem ?? ""}</Td>
              <Td num>{formatarInteiro(i.fichas)}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao titulo="Revisão de preço com piso e teto" descricao="preco_minimo = custo_ficha / meta_cmv_bloco · sugerido arredonda para cima ao múltiplo de R$ 5,00 · fora da faixa da seção é alerta">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Item" }, { rotulo: "Seção" }, { rotulo: "Preço", num: true }, { rotulo: "Custo", num: true }, { rotulo: "CMV", num: true }, { rotulo: "Mínimo", num: true }, { rotulo: "Sugerido", num: true }, { rotulo: "Faixa" }]}>
          {itensCusto.filter((i) => ["pizza", "entrada", "sobremesa"].includes(i.bloco)).map((i) => (
            <tr key={i.produtoId}>
              <Td><Semaforo nivel={i.cmv === null ? null : i.critico ? "critico" : i.acimaDaMeta ? "alerta" : "otimo"} /></Td>
              <Td>{i.nome}{i.origemCusto === "referencia" && <span className="text-xs text-cinza-escuro"> (custo de referência)</span>}</Td>
              <Td>{i.secao ?? ""}</Td>
              <Td num>{formatarMoeda(i.preco)}</Td>
              <Td num>{formatarMoeda(i.custo)}</Td>
              <Td num>{formatarPercentual(i.cmv)}</Td>
              <Td num>{formatarMoeda(i.precoMinimo)}</Td>
              <Td num>{formatarMoeda(i.precoSugerido)}</Td>
              <Td>{i.faixa === "dentro" ? "dentro" : i.faixa ? `${i.faixa.replace(/_/g, " ")} (${formatarMoeda(i.piso)} a ${formatarMoeda(i.tetoFaixa)})` : "sem faixa"}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao titulo="Avaliação e certificações · matriz de polivalência" descricao="nível 1 a 4 por processo crítico · redundância mínima: 2 certificados nível ≥ 2">
        {matriz.colaboradores.length === 0 || matriz.processos.length === 0 ? (
          <Aviso nivel="info">sem dado: cadastre colaboradores e processos críticos, e lance as certificações em Cadastro › Certificações.</Aviso>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  {matriz.processos.map((p) => (
                    <th key={p.id} className="num">{p.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.colaboradores.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome} <span className="text-xs text-cinza-escuro">{c.cargo}</span></td>
                    {matriz.processos.map((p) => (
                      <td key={p.id} className="num">{matriz.nivel(c.id, p.id) ?? "—"}</td>
                    ))}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td>Certificados nível ≥ 2</td>
                  {matriz.processos.map((p) => {
                    const n = matriz.certificadosNivel2(p.id);
                    return (
                      <td key={p.id} className="num">{n}{n < 2 && " ▲"}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Calendário de risco dos próximos 90 dias">
        <Tabela cabecalho={[{ rotulo: "" }, { rotulo: "Documento" }, { rotulo: "Tipo" }, { rotulo: "Vencimento" }, { rotulo: "Responsável" }]} vazio={risco90.length === 0 ? <div className="p-3 text-sm text-cinza-escuro">nenhum documento vence nos próximos 90 dias{documentos.length === 0 ? " (nenhum documento cadastrado)" : ""}</div> : null}>
          {risco90.map((d) => {
            const dias = Math.floor((new Date(`${d.vencimento}T12:00:00-03:00`).getTime() - hoje) / 86_400_000);
            return (
              <tr key={d.id}>
                <Td><Semaforo nivel={dias < 0 ? "critico" : dias <= d.alertaDias ? "alerta" : "atencao"} /></Td>
                <Td>{d.nome}</Td>
                <Td>{d.tipo}</Td>
                <Td>{formatarDataIso(d.vencimento)} ({dias < 0 ? `vencido há ${-dias} dias` : `em ${dias} dias`})</Td>
                <Td>{d.responsavel ?? "—"}</Td>
              </tr>
            );
          })}
        </Tabela>
      </Secao>
    </>
  );
}
