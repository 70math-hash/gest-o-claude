import { formatarMoeda, formatarPercentual, hojeIso } from "@/formato";
import { listarProdutosAtivos } from "@/lib/dados/cadastro";
import { margemCanal } from "@/lib/dados/leitura";
import { Aviso, BotaoLink, Grade, Indicador, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { SeletorProduto } from "./seletor";

export const metadata = { title: "Canais" };

export default async function PaginaCanais({ searchParams }: { searchParams: Promise<{ produto?: string; data?: string }> }) {
  const p = await searchParams;
  const data = p.data && /^\d{4}-\d{2}-\d{2}$/.test(p.data) ? p.data : hojeIso();
  const produtos = await listarProdutosAtivos();
  const produtoId = p.produto && produtos.some((x) => x.id === p.produto) ? p.produto : (produtos.find((x) => x.nome === "Pomodori")?.id ?? produtos[0]?.id);
  const linhas = produtoId ? await margemCanal(produtoId, data) : [];
  const produto = produtos.find((x) => x.id === produtoId);
  const salao = linhas.find((l) => l.tipo === "salao");
  const casaEntrega = linhas.find((l) => l.tipo === "marketplace" && l.entregaPor === "casa" && l.margem !== null);
  const plataformaEntrega = linhas.find((l) => l.tipo === "marketplace" && l.entregaPor === "plataforma" && l.margem !== null);
  // entrega_de_virada: custo de entrega em que o plano "casa entrega" iguala o plano "plataforma entrega".
  const entregaDeVirada = casaEntrega && plataformaEntrega && casaEntrega.margem !== null && plataformaEntrega.margem !== null ? casaEntrega.margem + casaEntrega.entrega - plataformaEntrega.margem : null;
  return (
    <>
      <Titulo sub="mc_canal = preco − preco × comissao − preco × taxa_pagamento − embalagem − entrega − custo_ficha · salão = índice 100" acoes={<BotaoLink href="/cadastro/canais" secundario>Parâmetros dos canais</BotaoLink>}>
        Canais
      </Titulo>
      <div className="mb-4">
        <SeletorProduto produtos={produtos.map((x) => ({ id: x.id, nome: x.nome, bloco: x.bloco }))} produtoId={produtoId ?? ""} data={data} />
      </div>
      {produto && (
        <Secao titulo={`${produto.nome} · preço ${formatarMoeda(salao?.preco ?? null)} · custo ${formatarMoeda(salao?.custo ?? null)}`}>
          <Tabela cabecalho={[{ rotulo: "Canal" }, { rotulo: "Comissão", num: true }, { rotulo: "Taxa pagamento", num: true }, { rotulo: "Embalagem", num: true }, { rotulo: "Entrega", num: true }, { rotulo: "Margem", num: true }, { rotulo: "Índice", num: true }, { rotulo: "Preço de equivalência", num: true }]}>
            {linhas.map((l) => (
              <tr key={l.canalId}>
                <Td>
                  {l.canal}
                  {l.falta && <div className="text-xs text-cinza-escuro">falta: {l.falta}</div>}
                </Td>
                <Td num>{formatarPercentual(l.comissao)}</Td>
                <Td num>{formatarPercentual(l.taxa)}</Td>
                <Td num>{formatarMoeda(l.embalagem)}</Td>
                <Td num>{formatarMoeda(l.entrega)}</Td>
                <Td num>{formatarMoeda(l.margem)}</Td>
                <Td num>{l.indice === null ? "sem dado" : Math.round(l.indice * 100)}</Td>
                <Td num>{l.tipo === "salao" ? "—" : formatarMoeda(l.precoEquivalencia)}</Td>
              </tr>
            ))}
          </Tabela>
          <div className="mt-4">
            <Grade colunas={3}>
              <Indicador codigo="entrega_de_virada" nome="Entrega de virada" valor={entregaDeVirada} tipo="reais" falta="um plano em que a casa entrega e um em que a plataforma entrega, ambos com parâmetros" detalhe={casaEntrega && plataformaEntrega ? `${casaEntrega.canal} contra ${plataformaEntrega.canal}` : undefined} />
              <Indicador codigo="preco_equivalencia" nome="Preço de equivalência (plataforma entrega)" valor={plataformaEntrega?.precoEquivalencia ?? null} tipo="reais" falta="plano com entrega da plataforma" detalhe="preço que devolve a margem do salão" />
              <Indicador codigo="mc_canal" nome="Margem no salão" valor={salao?.margem ?? null} tipo="reais" falta={salao?.falta ?? "canal salão"} />
            </Grade>
          </div>
        </Secao>
      )}
      <Aviso nivel="info">Valores de partida de 2026: iFood básico 12% + 3,2%, entrega 23% + 3,2%, flex 24%; Rappi 27% + 3,5%; embalagem R$ 3,00; entrega própria R$ 9,00. 99Food e Keeta entram sem comissão até você informar em Parâmetros dos canais.</Aviso>
    </>
  );
}
