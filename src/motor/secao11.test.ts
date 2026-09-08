/**
 * Testes de aceite da seção 11. Os números são de fichas reais da casa,
 * abril de 2026. Tolerância de R$ 0,01 e de 0,1 ponto percentual.
 * Estes testes passam para sempre (passo 5 da seção 0).
 */
import { describe, expect, it } from "vitest";
import { arredondar, ErroBloqueio } from "./numero";
import { cmvItem, cmvPonderado, custoFicha, custoIngrediente, custoProducaoPorUnidade, distorcaoRendimento, margemContribuicaoItem } from "./custo";
import { cmvDia2x1 } from "./dois_por_um";
import { precoMinimo, precoSugerido } from "./precificacao";
import { dreVertical, pontoEquilibrio } from "./financeiro";
import { entregaDeVirada, precoEquivalencia, tabelaCanais } from "./canais";
import { classificar } from "./engenharia";
import { impactoAttach } from "./salao";
import { CANAIS_2026, FICHAS, VENDAS_ENTRADAS_T1_2026 } from "./fixtures_secao11";

const REAIS = 0.01;
const PONTOS = 0.001;

function pertoReais(valor: number | null, esperado: number) {
  expect(valor).not.toBeNull();
  expect(Math.abs((valor as number) - esperado)).toBeLessThanOrEqual(REAIS + 1e-9);
}
function pertoPct(fracao: number | null, esperadoPct: number) {
  expect(fracao).not.toBeNull();
  expect(Math.abs((fracao as number) - esperadoPct / 100)).toBeLessThanOrEqual(PONTOS + 1e-12);
}

describe("11.1 custo de ingrediente com rendimento", () => {
  it("grana padano 20 g a R$ 115,25/kg com 88% custa R$ 2,62", () => {
    const r = custoIngrediente({ quantidade: 20, unidade: "g", precoPorUnidadeBase: 115.25, unidadeBase: "kg", rendimento: 0.88 });
    pertoReais(r.custo, 2.62);
  });
  it("fior di latte 90 g a R$ 65,00/kg com 100% custa R$ 5,85", () => {
    const r = custoIngrediente({ quantidade: 90, unidade: "g", precoPorUnidadeBase: 65, unidadeBase: "kg", rendimento: 1 });
    pertoReais(r.custo, 5.85);
  });
  it("par fior + grana custa R$ 8,47", () => {
    const f = custoFicha([
      { tipo: "insumo", nome: "Fior di latte", quantidade: 90, unidade: "g", precoPorUnidadeBase: 65, unidadeBase: "kg", rendimento: 1 },
      { tipo: "insumo", nome: "Grana padano", quantidade: 20, unidade: "g", precoPorUnidadeBase: 115.25, unidadeBase: "kg", rendimento: 0.88 },
    ]);
    pertoReais(f.custo, 8.47);
  });
  it("manjericão italiano 10 g a R$ 299,00/kg com 60%: R$ 2,99 no Altec e R$ 4,98 real", () => {
    const r = custoIngrediente({ quantidade: 10, unidade: "g", precoPorUnidadeBase: 299, unidadeBase: "kg", rendimento: 0.6 });
    pertoReais(r.custoAltec, 2.99);
    pertoReais(r.custo, 4.98);
  });
});

describe("11.2 produção intermediária e rendimento de batelada", () => {
  it("tortano: batelada de R$ 95,25 com 2,2 kg dá R$ 43,30/kg", () => {
    pertoReais(custoProducaoPorUnidade({ custoBatelada: 95.25, rendimentoDeclarado: 2.2 }), 43.3);
  });
  it("creme de abobrinha com 2,1 kg dá R$ 9,73/kg", () => {
    const custoPorKg = 9.73;
    pertoReais(custoProducaoPorUnidade({ custoBatelada: custoPorKg * 2.1, rendimentoDeclarado: 2.1 }), 9.73);
  });
  it("pão de calabresa: 350 g de tortano + 100 g de molho de queijo dá R$ 16,15 e CMV 24,8% a R$ 65,00", () => {
    const f = custoFicha(FICHAS.paoDeCalabresa.itens as never);
    pertoReais(f.itens[0]!.custo, 15.16);
    pertoReais(f.itens[1]!.custo, 1.0);
    pertoReais(f.custo, 16.15);
    pertoPct(cmvItem(f.custo, 65), 24.8);
  });
  it("sem o rendimento da batelada o Altec mostrava R$ 108,79/kg e CMV de 60,1%, um erro de 251%", () => {
    const custoAltecPorKg = custoProducaoPorUnidade({ custoBatelada: 108.79, rendimentoDeclarado: 1 });
    const f = custoFicha(FICHAS.paoDeCalabresa.itens as never);
    pertoReais(f.custoAltec, 0.35 * custoAltecPorKg + 0.1 * 9.95);
    pertoPct(cmvItem(f.custoAltec, 65), 60.1);
    expect(Math.round((custoAltecPorKg / 43.3) * 100)).toBe(251);
  });
  it("cadastro de produção sem rendimento é bloqueado", () => {
    expect(() => custoProducaoPorUnidade({ custoBatelada: 95.25, rendimentoDeclarado: null })).toThrow(ErroBloqueio);
    expect(() => custoProducaoPorUnidade({ custoBatelada: 95.25, rendimentoDeclarado: 0 })).toThrow(ErroBloqueio);
  });
});

describe("11.3 CMV de prato, com e sem rendimento", () => {
  it("Pomodori: custo R$ 15,77 a R$ 75,00, CMV Altec 21,0% e real 21,0%", () => {
    const f = custoFicha(FICHAS.pomodori.itens as never);
    pertoReais(f.custoAltec, 15.77);
    pertoReais(f.custo, 15.77);
    pertoPct(cmvItem(f.custoAltec, 75), 21.0);
    pertoPct(cmvItem(f.custo, 75), 21.0);
  });
  it("Salada Caprese: custo Altec R$ 11,90 a R$ 45,00, CMV Altec 26,4% e real 32,5%", () => {
    const f = custoFicha(FICHAS.saladaCaprese.itens as never);
    pertoReais(f.custoAltec, 11.9);
    pertoPct(cmvItem(f.custoAltec, 45), 26.4);
    pertoPct(cmvItem(f.custo, 45), 32.5);
    const d = distorcaoRendimento(f, 45);
    expect(d.alerta).toBe(true);
    expect(d.insumoResponsavel).toBe("Manjericão italiano");
  });
  it("Fritto di Bufala: custo Altec R$ 23,30 a R$ 65,00, CMV Altec 35,8% e real 37,4%", () => {
    const f = custoFicha(FICHAS.frittoDiBufala.itens as never);
    pertoReais(f.custoAltec, 23.3);
    pertoPct(cmvItem(f.custoAltec, 65), 35.8);
    pertoPct(cmvItem(f.custo, 65), 37.4);
  });
  it("preço mínimo para CMV alvo: custo R$ 19,55 com 23% dá R$ 85,00", () => {
    pertoReais(precoMinimo(19.55, 0.23), 85.0);
    expect(precoSugerido(19.55, 0.23)).toBe(85);
    expect(precoSugerido(19.56, 0.23)).toBe(90);
  });
});

describe("11.4 dia com 2x1", () => {
  it("receita R$ 1.442,00, pagas R$ 301,53, gratuitas R$ 85,19, total R$ 386,72, CMV 26,82%", () => {
    const r = cmvDia2x1(
      [{ preco: 1442, custo: 301.53 }],
      [{ custo: 85.19 }],
    );
    pertoReais(r.receitaBruta, 1442);
    pertoReais(r.custoTotal, 386.72);
    expect(Math.abs((r.cmv as number) - 0.2682)).toBeLessThanOrEqual(0.0001);
  });
});

describe("11.5 DRE de referência e prime cost", () => {
  const base = { receitaBruta: 100, impostos: 9, taxasPagamento: 3.5, comissoesMarketplace: 0, embalagem: 0 };
  it("CMV 28 e folha 28: receita líquida 87,5, MC 59,5, fixos 51,0, resultado 8,5, prime cost 56,0", () => {
    const d = dreVertical({ ...base, cmv: 28, folhaComEncargos: 28, outrosFixos: [{ nome: "Ocupação", valor: 9 }, { nome: "Utilidades", valor: 4 }, { nome: "Operacional", valor: 7 }, { nome: "Marketing", valor: 3 }] });
    pertoReais(d.receitaLiquida, 87.5);
    pertoReais(d.margemContribuicao, 59.5);
    pertoPct(d.mcPct, 59.5);
    pertoReais(d.custosFixos, 51);
    pertoReais(d.resultadoOperacional, 8.5);
    pertoPct(d.primeCostPct, 56.0);
  });
  it("CMV 32 e folha 30: prime cost 62 e resultado 2,5", () => {
    const d = dreVertical({ ...base, cmv: 32, folhaComEncargos: 30, outrosFixos: [{ nome: "Ocupação", valor: 9 }, { nome: "Utilidades", valor: 4 }, { nome: "Operacional", valor: 7 }, { nome: "Marketing", valor: 3 }] });
    pertoPct(d.primeCostPct, 62);
    pertoReais(d.resultadoOperacional, 2.5);
  });
});

describe("11.6 ponto de equilíbrio", () => {
  const pe = pontoEquilibrio({ receita: 400_000, custosVariaveis: 162_000, custosFixos: 204_000, ticketMedio: 180, diasAbertos: 26, lucroAlvo: 50_000 });
  it("margem de contribuição R$ 238.000,00 e 59,5%", () => {
    pertoReais(pe.margemContribuicao, 238_000);
    pertoPct(pe.mcPct, 59.5);
  });
  it("ponto de equilíbrio R$ 342.857,14, 1.904,8 clientes, 73,3 por dia", () => {
    pertoReais(pe.reais, 342_857.14);
    expect(arredondar(pe.clientes as number, 1)).toBe(1904.8);
    expect(arredondar(pe.porDia as number, 1)).toBe(73.3);
  });
  it("margem de segurança 14,29%", () => {
    expect(Math.abs((pe.margemSeguranca as number) - 0.1429)).toBeLessThanOrEqual(0.0001);
  });
  it("receita para o lucro alvo R$ 426.890,76, ou 2.371,6 clientes", () => {
    pertoReais(pe.receitaLucroAlvo, 426_890.76);
    expect(arredondar(pe.clientesLucroAlvo as number, 1)).toBe(2371.6);
  });
});

describe("11.7 margem por canal", () => {
  const preco = 75;
  const custo = 15.77;
  const tabela = tabelaCanais(preco, custo, CANAIS_2026);
  it.each([
    ["Salão", 56.83, 100],
    ["Canal próprio, casa entrega", 44.83, 79],
    ["Marketplace básico, casa entrega", 35.83, 63],
    ["Marketplace entrega da plataforma", 36.58, 64],
    ["Marketplace 27% mais 3,5%", 33.36, 59],
  ])("%s: margem R$ %s e índice %s", (nome, margem, indice) => {
    const linha = tabela.find((l) => l.nome === nome)!;
    pertoReais(linha.margem, margem as number);
    expect(Math.round((linha.indice as number) * 100)).toBe(indice);
  });
  it("entrega de virada R$ 8,25", () => {
    const basico = CANAIS_2026[2]!;
    const plataforma = CANAIS_2026[3]!;
    pertoReais(entregaDeVirada(preco, custo, basico, plataforma), 8.25);
  });
  it("preço de equivalência do plano de 23% mais 3,2%: R$ 102,44", () => {
    const mcSalao = tabela[0]!.margem;
    pertoReais(precoEquivalencia({ mcSalao, embalagem: 3, custoFicha: custo, entrega: 0, comissao: 0.23, taxaPagamento: 0.032 }), 102.44);
  });
});

describe("11.8 engenharia de cardápio, entradas, primeiro trimestre de 2026", () => {
  const itens = VENDAS_ENTRADAS_T1_2026.map((v) => {
    const ficha = FICHAS[v.chave];
    const custo = custoFicha(ficha.itens as never).custo;
    return { id: v.chave, nome: ficha.nome, qtde: v.qtde, precoVenda: ficha.preco, custoFicha: custo, margemContribuicao: margemContribuicaoItem({ precoVenda: ficha.preco, custoFicha: custo, imposto: 0.09, taxaPagamento: 0.035 }) };
  });
  const miller = classificar(itens, "miller", 0.7);
  it("422 unidades em 9 itens, piso de popularidade 32,8 unidades, CMV ponderado do bloco 22,2%", () => {
    expect(miller.unidades).toBe(422);
    expect(miller.numeroItens).toBe(9);
    expect(arredondar(miller.pisoPopularidadeUnidades, 1)).toBe(32.8);
    pertoPct(miller.cmvPonderado, 22.2);
  });
  it.each([
    ["sticks", 16.0, "estrela"],
    ["arancini", 9.7, "estrela"],
    ["carpaccio", 25.4, "cavalo_de_batalha"],
    ["frittoDiBufala", 37.4, "cavalo_de_batalha"],
    ["saladaCaprese", 32.5, "abacaxi"],
    ["paoDeCalabresa", 24.8, "abacaxi"],
  ])("%s com CMV %s%% é %s pela matriz de Miller", (chave, cmv, quadrante) => {
    const item = miller.itens.find((i) => i.id === chave)!;
    pertoPct(item.cmv, cmv as number);
    expect(item.quadrante).toBe(quadrante);
  });
  it("a matriz de Kasavana-Smith roda sobre os mesmos itens e registra qual matriz foi usada", () => {
    const ks = classificar(itens, "kasavana_smith", 0.7);
    expect(ks.matriz).toBe("kasavana_smith");
    expect(ks.itens).toHaveLength(9);
    expect(ks.itens.find((i) => i.id === "saladaCaprese")!.quadrante).toBe("abacaxi");
  });
});

describe("11.9 attach de sobremesa", () => {
  it("custo R$ 2,83, preço R$ 30,00, imposto 9% e cartão 3,5%: margem R$ 23,42", () => {
    pertoReais(margemContribuicaoItem({ precoVenda: 30, custoFicha: 2.83, imposto: 0.09, taxaPagamento: 0.035 }), 23.42);
  });
  it("40 mesas, attach de 20% para 30%: 4 mesas, R$ 93,68 por noite, R$ 2.435,68 em 26 noites, R$ 29.228,16 em 12 meses", () => {
    const mc = margemContribuicaoItem({ precoVenda: 30, custoFicha: 2.83, imposto: 0.09, taxaPagamento: 0.035 });
    const noite = impactoAttach({ mesas: 40, attachAtual: 0.2, attachAlvo: 0.3, margemContribuicaoItem: mc, noites: 26 });
    expect(arredondar(noite.mesasAMais, 6)).toBe(4);
    pertoReais(noite.ganhoPorNoite, 93.68);
    pertoReais(noite.ganhoPeriodo, 2435.68);
    expect(Math.round(noite.ganhoPeriodo)).toBe(2436);
    const ano = impactoAttach({ mesas: 40, attachAtual: 0.2, attachAlvo: 0.3, margemContribuicaoItem: mc, noites: 26 * 12 });
    pertoReais(ano.ganhoPeriodo, 29_228.16);
    expect(Math.round(ano.ganhoPeriodo)).toBe(29_228);
  });
});

describe("CMV ponderado por bloco (5.1) sobre as vendas do trimestre", () => {
  it("usa o total líquido para o CMV operacional e o valor de tabela para o de cardápio", () => {
    const vendas = VENDAS_ENTRADAS_T1_2026.map((v) => {
      const ficha = FICHAS[v.chave];
      return { custoFicha: custoFicha(ficha.itens as never).custo, qtde: v.qtde, total: ficha.preco * v.qtde * 0.95, valBruto: ficha.preco * v.qtde };
    });
    const r = cmvPonderado(vendas);
    pertoPct(r.cmvTabela, 22.2);
    expect(r.cmvOperacional!).toBeGreaterThan(r.cmvTabela!);
  });
});
