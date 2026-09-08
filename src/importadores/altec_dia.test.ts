import { describe, expect, it } from "vitest";
import { lerAltecDia } from "./altec_dia";
import { DIA_AGRUPADO_CSV, DIA_CSV } from "./fixtures/altec_dia";
import { lerTabela } from "./tabela";

describe("lerAltecDia", () => {
  const dia = lerAltecDia(lerTabela({ nome: "vendas_dia.csv", conteudo: DIA_CSV }), { taxaServicoPct: 0.13 });

  it("lê a data do cabeçalho e separa os segmentos", () => {
    expect(dia.data).toBe("2026-04-05");
    expect(dia.porSegmento).toEqual({ cozinha: 760, salao: 126, bar: 190, delivery: 186 });
    expect(dia.semSegmento).toBe(0);
    expect(dia.vendas).toBe(1262);
    expect(dia.pratosVendidos).toBe(14);
    expect(dia.linhas).toHaveLength(5);
    expect(dia.linhasIgnoradas).toBe(1); // linha TOTAL
  });

  it("calcula a taxa de serviço de 13% sobre cozinha, salão e bar e avisa", () => {
    expect(dia.taxaServicoExplicita).toBe(false);
    expect(dia.taxaServico).toBeCloseTo(139.88, 2);
    expect(dia.faturamentoBruto).toBeCloseTo(1401.88, 2);
    expect(dia.avisos.some((a) => a.includes("calculada como 13% sobre R$ 1076") && a.includes("taxaServicoPct"))).toBe(true);
    // aceita o parâmetro em percentual também
    const emPercentual = lerAltecDia(lerTabela({ nome: "vendas_dia.csv", conteudo: DIA_CSV }), { taxaServicoPct: 13 });
    expect(emPercentual.taxaServico).toBeCloseTo(139.88, 2);
  });

  it("agrupa receita e itens por colaborador a partir de 'código - nome'", () => {
    expect(dia.porColaborador.map((c) => [c.codigo, c.nome, c.segmento, c.receita, c.itens])).toEqual([
      ["12", "JOAO", "cozinha", 760, 14],
      ["21", "PEDRO", "bar", 190, 5],
      ["15", "MARIA", "salao", 126, 3],
    ]);
    expect(dia.porColaborador[0]?.porSegmento).toEqual({ cozinha: 760, salao: 0, bar: 0, delivery: 0 });
  });

  it("linha de delivery sem colaborador não vira colaborador", () => {
    expect(dia.linhas.find((l) => l.segmento === "delivery")).toMatchObject({ produto: "MARGHERITA", qtde: 3, valorLiquido: 186, valorBruto: 186, colaboradorCodigo: null, colaboradorNome: null });
  });
});

describe("lerAltecDia com grupo em linha de agrupamento e taxa explícita", () => {
  const dia = lerAltecDia(lerTabela({ nome: "vendas.csv", conteudo: DIA_AGRUPADO_CSV }), { taxaServicoPct: 0.13 });

  it("carrega o grupo adiante, lê a taxa lançada como item e não a recalcula", () => {
    expect(dia.data).toBe("2026-04-05");
    expect(dia.taxaServicoExplicita).toBe(true);
    expect(dia.taxaServico).toBe(30.55);
    expect(dia.vendas).toBe(235);
    expect(dia.faturamentoBruto).toBe(265.55);
    expect(dia.avisos.some((a) => a.includes("calculada"))).toBe(false);
    expect(dia.porSegmento).toEqual({ cozinha: 199, salao: 16, bar: 0, delivery: 0 });
    expect(dia.pratosVendidos).toBe(3);
  });

  it("grupo desconhecido fica sem segmento e gera aviso", () => {
    expect(dia.semSegmento).toBe(20);
    expect(dia.linhas.find((l) => l.produto === "ESTACIONAMENTO")).toMatchObject({ grupo: "OUTROS", segmento: null });
    expect(dia.avisos.some((a) => a.includes('Grupo desconhecido "OUTROS"'))).toBe(true);
  });

  it("código e nome em colunas separadas", () => {
    expect(dia.porColaborador.map((c) => [c.codigo, c.nome, c.receita, c.itens])).toEqual([
      ["12", "JOAO", 160, 5],
      ["15", "MARIA", 75, 1],
    ]);
  });
});

describe("lerAltecDia sem cabeçalho", () => {
  it("devolve vazio com aviso", () => {
    const dia = lerAltecDia([["nada"], ["1", "2"]], { taxaServicoPct: 0.13 });
    expect(dia.linhas).toEqual([]);
    expect(dia.faturamentoBruto).toBe(0);
    expect(dia.avisos[0]).toMatch(/Cabeçalho da venda do dia não encontrado/);
  });
});
