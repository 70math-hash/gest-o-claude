import { describe, expect, it } from "vitest";
import { lerAltecR3, lerPeriodoCabecalho, mapearProdutos, normalizarIdAltec, type ProdutoCatalogo } from "./altec_r3";
import { xlsxDe } from "./fixtures/planilha";
import { R3_AGRUPADO_CSV, R3_CSV, R3_MATRIZ } from "./fixtures/r3";
import { lerTabela } from "./tabela";

const somar = (valores: Array<number | null>): number => valores.reduce<number>((s, v) => s + (v ?? 0), 0);

describe("lerAltecR3 (CSV)", () => {
  const r3 = lerAltecR3(lerTabela({ nome: "r3.csv", conteudo: R3_CSV }));

  it("detecta o cabeçalho real depois das 12 linhas institucionais e lê o período", () => {
    expect(r3.colunas.produto).toBe(2);
    expect(r3.periodo).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
  });

  it("remove subtotais e total geral, mantendo as 11 linhas de produto", () => {
    expect(r3.linhas).toHaveLength(11);
    expect(r3.linhasLidas).toBe(19);
    expect(r3.linhasIgnoradas).toBe(8);
    expect(r3.linhas.map((l) => l.nomeAltec)).not.toContain("Subtotal PIZZAS");
    expect(r3.linhas.map((l) => l.nomeAltec)).not.toContain("Total Geral");
    expect(somar(r3.linhas.map((l) => l.total))).toBeCloseTo(4560, 2);
    expect(somar(r3.linhas.map((l) => l.valBruto))).toBeCloseTo(4656, 2);
    expect(somar(r3.linhas.map((l) => l.qtde))).toBe(86);
  });

  it("converte números brasileiros e separa bruto de líquido", () => {
    const margherita = r3.linhas.find((l) => l.nomeAltec === "MARGHERITA");
    expect(margherita).toMatchObject({
      idAltec: "100011",
      categoriaAltec: "PIZZAS",
      bloco: "pizza",
      canal: "salao",
      qtde: 29,
      vlTabela: 62,
      descProd: 60,
      descGlobal: 36,
      valBruto: 1798,
      total: 1702,
      pctTotal: 37.32,
      nomeChave: "MARGHERITA",
    });
    const chocolate = r3.linhas.find((l) => l.idAltec === "120060");
    expect(chocolate?.nomeAltec).toBe("CHOCOLATE, AZEITE E FLOR DE SAL");
    expect(chocolate?.total).toBe(60);
    const pao = r3.linhas.find((l) => l.nomeAltec === "PÃO DA CASA");
    expect(pao?.idAltec).toBeNull();
    expect(pao?.nomeChave).toBe("PAO DA CASA");
  });

  it("classifica a categoria em bloco e manda a desconhecida para a fila", () => {
    const blocoDe = (nome: string): string | null | undefined => r3.linhas.find((l) => l.nomeAltec === nome)?.bloco;
    expect(blocoDe("MARGHERITA")).toBe("pizza");
    expect(blocoDe("PIZZA ACIDA")).toBe("pizza");
    expect(blocoDe("DOCE PAIOLZINHO")).toBe("pizza");
    expect(blocoDe("STICKS (ENTRADA)")).toBe("entrada");
    expect(blocoDe("QTMISU 2.0")).toBe("sobremesa");
    expect(blocoDe("NEGRONI")).toBe("bar");
    expect(blocoDe("VINHO TINTO TAÇA")).toBe("salao");
    expect(blocoDe("BRINDE ANIVERSARIO")).toBeNull();
    expect(r3.categoriasDesconhecidas).toEqual(["BRINDES E CORTESIAS"]);
    expect(r3.avisos.some((a) => a.includes('Categoria desconhecida "BRINDES E CORTESIAS"'))).toBe(true);
  });

  it("nomeChave remove sufixos operacionais", () => {
    expect(r3.linhas.find((l) => l.nomeAltec === "STICKS (ENTRADA)")?.nomeChave).toBe("STICKS");
    expect(r3.linhas.find((l) => l.nomeAltec === "PIZZA ACIDA")?.nomeChave).toBe("ACIDA");
    expect(r3.linhas.find((l) => l.nomeAltec === "DOCE PAIOLZINHO")?.nomeChave).toBe("DOCE");
  });
});

describe("lerAltecR3 (XLSX em memória)", () => {
  it("lê o mesmo conteúdo pelo caminho de planilha", () => {
    const tabela = lerTabela({ nome: "r3.xlsx", conteudo: xlsxDe([{ nome: "R3", linhas: R3_MATRIZ }]) });
    expect(tabela.formato).toBe("xlsx");
    const r3 = lerAltecR3(tabela);
    expect(r3.periodo).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
    expect(r3.linhas).toHaveLength(11);
    expect(somar(r3.linhas.map((l) => l.total))).toBeCloseTo(4560, 2);
    const margherita = r3.linhas.find((l) => l.nomeAltec === "MARGHERITA");
    expect(margherita).toMatchObject({ idAltec: "100011", qtde: 29, valBruto: 1798, total: 1702, pctTotal: 37.32, bloco: "pizza" });
    expect(r3.categoriasDesconhecidas).toEqual(["BRINDES E CORTESIAS"]);
  });
});

describe("lerAltecR3 com categoria em linha de agrupamento", () => {
  const r3 = lerAltecR3(lerTabela({ nome: "r3_agrupado.csv", conteudo: R3_AGRUPADO_CSV }));

  it("carrega a categoria adiante e lê o período 'de ... até ...'", () => {
    expect(r3.periodo).toEqual({ inicio: "2026-04-01", fim: "2026-04-05" });
    expect(r3.linhas.map((l) => [l.nomeAltec, l.categoriaAltec, l.bloco])).toEqual([
      ["MARGHERITA", "PIZZAS", "pizza"],
      ["BURRATA PIZZA", "PIZZAS", "pizza"],
      ["BURRATA (ENTRADA)", "ENTRADAS", "entrada"],
    ]);
    expect(r3.linhas[2]).toMatchObject({ descProd: 40, valBruto: 90, total: 50 });
    expect(r3.categoriasDesconhecidas).toEqual([]);
  });
});

describe("lerAltecR3 sem cabeçalho", () => {
  it("devolve vazio com aviso", () => {
    const r3 = lerAltecR3([["QT PIZZA BAR"], ["nada aqui", "1"]]);
    expect(r3.linhas).toEqual([]);
    expect(r3.avisos[0]).toMatch(/Cabeçalho do R3 não encontrado/);
  });

  it("lerPeriodoCabecalho aceita os formatos previstos", () => {
    expect(lerPeriodoCabecalho([["Período: 01/04/2026 a 30/04/2026"]], 1)).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
    expect(lerPeriodoCabecalho([["Vendas de 01/04/2026 até 05/04/2026"]], 1)).toEqual({ inicio: "2026-04-01", fim: "2026-04-05" });
    expect(lerPeriodoCabecalho([["01/04/2026 - 30/04/2026"]], 1)).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
    expect(lerPeriodoCabecalho([["Data: 05/04/2026"]], 1)).toEqual({ inicio: "2026-04-05", fim: "2026-04-05" });
    expect(lerPeriodoCabecalho([["Emissão: 01/05/2026 10:32"]], 1)).toBeNull();
    expect(lerPeriodoCabecalho([["sem data"]], 1)).toBeNull();
  });

  it("normalizarIdAltec limpa decimais de planilha", () => {
    expect(normalizarIdAltec("100010")).toBe("100010");
    expect(normalizarIdAltec("100010,0")).toBe("100010");
    expect(normalizarIdAltec("100010.0")).toBe("100010");
    expect(normalizarIdAltec("")).toBeNull();
    expect(normalizarIdAltec("sazonal")).toBe("SAZONAL");
  });
});

describe("mapearProdutos", () => {
  const catalogo: ProdutoCatalogo[] = [
    { produtoId: "p-margherita", idAltec: "100011", nomeAltec: "MARGHERITA", nome: "Margherita", bloco: "pizza" },
    // Rúcola ainda sem ID e sem nome Altec cadastrado: só casa pela chave do nome do sistema.
    { produtoId: "p-rucola", idAltec: null, nomeAltec: "", nome: "Rúcola", bloco: "pizza" },
    // Ácida sem ID no catálogo: casa pelo nome Altec normalizado.
    { produtoId: "p-acida", idAltec: null, nomeAltec: "PIZZA ACIDA", nome: "Ácida (QB)", bloco: "pizza" },
    { produtoId: "p-doce", idAltec: "100259", nomeAltec: "DOCE PAIOLZINHO", nome: "Doce (QB)", bloco: "pizza" },
    // Sticks: casa "STICKS (ENTRADA)" pelo fallback sem sufixo.
    { produtoId: "p-sticks", idAltec: null, nomeAltec: "", nome: "Sticks", bloco: "entrada" },
    { produtoId: "p-pao", idAltec: "100007", nomeAltec: "PÃO DA CASA", nome: "Pão da Casa", bloco: "entrada" },
    { produtoId: "p-qtmisu", idAltec: "120056", nomeAltec: "QTMISU 2.0", nome: "QTmisu 2.0", bloco: "sobremesa" },
    { produtoId: "p-choc", idAltec: "120060", nomeAltec: "CHOCOLATE, AZEITE E FLOR DE SAL", nome: "Chocolate, Azeite e Flor de Sal", bloco: "sobremesa" },
  ];
  const r3 = lerAltecR3(lerTabela({ nome: "r3.csv", conteudo: R3_CSV }));
  const { mapeadas, pendentes, avisos } = mapearProdutos(r3.linhas, catalogo);
  const criterioDe = (nome: string): [string, string] | undefined => {
    const m = mapeadas.find((l) => l.nomeAltec === nome);
    return m ? [m.produtoId, m.criterio] : undefined;
  };

  it("casa por ID, por nome Altec e por chave sem sufixo", () => {
    expect(criterioDe("MARGHERITA")).toEqual(["p-margherita", "id_altec"]);
    expect(criterioDe("DOCE PAIOLZINHO")).toEqual(["p-doce", "id_altec"]);
    expect(criterioDe("QTMISU 2.0")).toEqual(["p-qtmisu", "id_altec"]);
    expect(criterioDe("CHOCOLATE, AZEITE E FLOR DE SAL")).toEqual(["p-choc", "id_altec"]);
    expect(criterioDe("PIZZA ACIDA")).toEqual(["p-acida", "nome_altec"]);
    expect(criterioDe("PÃO DA CASA")).toEqual(["p-pao", "nome_altec"]);
    expect(criterioDe("RUCOLA")).toEqual(["p-rucola", "nome_chave"]);
    expect(criterioDe("STICKS (ENTRADA)")).toEqual(["p-sticks", "nome_chave"]);
  });

  it("deixa pendente o que não tem match, sem aviso de ambiguidade", () => {
    expect(pendentes.map((l) => l.nomeAltec).sort()).toEqual(["BRINDE ANIVERSARIO", "NEGRONI", "VINHO TINTO TAÇA"]);
    expect(mapeadas).toHaveLength(8);
    expect(avisos).toEqual([]);
  });

  it("o ID Altec vence o nome quando os dois discordam", () => {
    const { mapeadas: m } = mapearProdutos(r3.linhas, [{ produtoId: "p-x", idAltec: "100012", nomeAltec: "RUCULA", nome: "Rúcula" }]);
    expect(m.find((l) => l.nomeAltec === "RUCOLA")?.produtoId).toBe("p-x");
  });

  it("desempata nome ambíguo pelo bloco; sem bloco fica pendente com aviso", () => {
    const agrupado = lerAltecR3(lerTabela({ nome: "r3.csv", conteudo: R3_AGRUPADO_CSV })).linhas;
    const burratas: ProdutoCatalogo[] = [
      { produtoId: "p-burrata-pizza", idAltec: null, nomeAltec: "", nome: "Burrata", bloco: "pizza" },
      { produtoId: "p-burrata-entrada", idAltec: null, nomeAltec: "", nome: "Burrata", bloco: "entrada" },
    ];
    const comBloco = mapearProdutos(agrupado, burratas);
    expect(comBloco.mapeadas.map((l) => [l.nomeAltec, l.produtoId])).toEqual([
      ["BURRATA PIZZA", "p-burrata-pizza"],
      ["BURRATA (ENTRADA)", "p-burrata-entrada"],
    ]);
    const semBloco = mapearProdutos(
      agrupado,
      burratas.map((b) => ({ ...b, bloco: null })),
    );
    expect(semBloco.mapeadas).toEqual([]);
    expect(semBloco.pendentes.map((l) => l.nomeAltec)).toEqual(["MARGHERITA", "BURRATA PIZZA", "BURRATA (ENTRADA)"]);
    expect(semBloco.avisos).toHaveLength(2);
    expect(semBloco.avisos[0]).toMatch(/2 produtos do catálogo casam por nome_chave/);
  });
});
