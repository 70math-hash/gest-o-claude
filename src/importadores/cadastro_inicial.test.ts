import { describe, expect, it } from "vitest";
import { lerCadastroInicial, normalizarUnidade, parseRendimentoPct } from "./cadastro_inicial";
import { CADASTRO_ABAS, FICHAS_CSV, INSUMOS_CSV, PRODUCOES_CSV } from "./fixtures/cadastro";
import { xlsxDe } from "./fixtures/planilha";
import { lerTabela } from "./tabela";

describe("lerCadastroInicial em três arquivos", () => {
  const resultado = lerCadastroInicial([
    lerTabela({ nome: "insumos.csv", conteudo: INSUMOS_CSV }),
    lerTabela({ nome: "producoes.csv", conteudo: PRODUCOES_CSV }),
    lerTabela({ nome: "fichas.csv", conteudo: FICHAS_CSV }),
  ]);

  it("normaliza insumos, produções e fichas", () => {
    expect(resultado.blocos.map((b) => b.layout)).toEqual(["insumos", "producoes", "fichas"]);
    expect(resultado.insumos).toHaveLength(5);
    expect(resultado.insumos[1]).toMatchObject({ nome: "Grana padano 12 meses", categoria: "Laticínios", unidadeCompra: "kg", unidadeUso: "g", preco: 115.25, rendimentoPct: 88, fornecedor: "Importadora Y", dataPreco: "2026-04-01" });
    expect(resultado.producoes.map((p) => [p.codigoAltec, p.nome, p.rendimento, p.unidadeRendimento, p.custoPorUnidade])).toEqual([
      ["298", "Tortano", 2.2, "kg", 43.3],
      ["254", "Creme de abobrinha", 2.1, "kg", 9.73],
      ["218", "Tomate San Marzano", null, "kg", 68.57],
    ]);
    expect(resultado.fichas.map((f) => [f.produto, f.idAltec, f.itens.length])).toEqual([
      ["Margherita", "100011", 4],
      ["Sticks", "100005", 2],
    ]);
  });

  it("resolve o tipo dos componentes pelo texto e pelos blocos lidos", () => {
    const margherita = resultado.fichas[0];
    expect(margherita?.itens.map((i) => [i.nomeComponente, i.tipo, i.codigoProducao, i.quantidade, i.unidadeNormalizada, i.rendimentoPct])).toEqual([
      ["Fior di latte", "insumo", null, 120, "g", 100],
      ["Grana padano 12 meses", "insumo", null, 20, "g", 88],
      ["Manjericão italiano", "insumo", null, 3, "g", 60],
      ["Tomate San Marzano", "producao", "218", 90, "g", 88],
    ]);
    const sticks = resultado.fichas[1];
    expect(sticks?.itens.map((i) => [i.nomeComponente, i.tipo])).toEqual([
      ["Massa de pizza", null],
      ["Azeite", "insumo"],
    ]);
    expect(resultado.avisos.some((a) => a.includes('"Massa de pizza" não encontrado'))).toBe(true);
  });

  it("relatório de inconsistências da seção 6.4 e da seção 8", () => {
    const tipos = resultado.relatorioInconsistencias.map((i) => [i.tipo, i.referencia]);
    expect(tipos).toEqual([
      ["preco_sem_data", "Manjericão italiano"],
      ["insumo_sem_preco", "Tomate italiano"],
      ["rendimento_fora_da_faixa", "Azeite"],
      ["producao_sem_rendimento", "Tomate San Marzano"],
      ["gramagem_suspeita", "Sticks › Massa de pizza"],
      ["gramagem_suspeita", "Sticks › Azeite"],
    ]);
    const azeite = resultado.relatorioInconsistencias.find((i) => i.referencia === "Azeite");
    expect(azeite?.detalhe).toContain("120%");
    const massa = resultado.relatorioInconsistencias.find((i) => i.referencia === "Sticks › Massa de pizza");
    expect(massa?.detalhe).toContain("acima de 1 kg");
    const azeiteFicha = resultado.relatorioInconsistencias.find((i) => i.referencia === "Sticks › Azeite");
    expect(azeiteFicha?.detalhe).toContain("abaixo de 0,5 g");
  });
});

describe("lerCadastroInicial em um arquivo só", () => {
  it("três abas de um XLSX, com o nome da aba como dica", () => {
    const tabela = lerTabela({ nome: "cadastro.xlsx", conteudo: xlsxDe(CADASTRO_ABAS) });
    const resultado = lerCadastroInicial(tabela);
    expect(resultado.blocos.map((b) => [b.layout, b.aba, b.linhas])).toEqual([
      ["insumos", "Insumos", 2],
      ["producoes", "Produções", 2],
      ["fichas", "Fichas", 3],
    ]);
    expect(resultado.insumos.map((i) => [i.nome, i.preco, i.dataPreco])).toEqual([
      ["Fior di latte", 65, "2026-04-01"],
      ["Tomate italiano", null, "2026-04-01"],
    ]);
    expect(resultado.producoes.map((p) => [p.codigoAltec, p.rendimento])).toEqual([
      ["298", 2.2],
      ["218", null],
    ]);
    expect(resultado.fichas.map((f) => [f.produto, f.idAltec, f.itens.map((i) => i.tipo)])).toEqual([
      ["Margherita", "100011", ["insumo", "producao"]],
      ["Sticks", "100005", [null]],
    ]);
    expect(resultado.relatorioInconsistencias.map((i) => i.tipo)).toEqual(["insumo_sem_preco", "producao_sem_rendimento", "gramagem_suspeita"]);
  });

  it("três blocos empilhados num CSV único, separados pelo cabeçalho", () => {
    const resultado = lerCadastroInicial(lerTabela({ nome: "cadastro.csv", conteudo: `${INSUMOS_CSV}\n${PRODUCOES_CSV}\n${FICHAS_CSV}` }));
    expect(resultado.blocos.map((b) => [b.layout, b.linhas])).toEqual([
      ["insumos", 5],
      ["producoes", 3],
      ["fichas", 6],
    ]);
    expect(resultado.relatorioInconsistencias).toHaveLength(6);
  });

  it("sem cabeçalho reconhecido, avisa", () => {
    const resultado = lerCadastroInicial({ linhas: [["a", "b"], ["1", "2"]] });
    expect(resultado.blocos).toEqual([]);
    expect(resultado.avisos[0]).toMatch(/Nenhum cabeçalho/);
  });
});

describe("utilidades do cadastro", () => {
  it("rendimento em percentual ou fração; unidades normalizadas", () => {
    expect(parseRendimentoPct("88")).toBe(88);
    expect(parseRendimentoPct("88%")).toBe(88);
    expect(parseRendimentoPct("0,88")).toBe(88);
    expect(parseRendimentoPct("1")).toBe(100);
    expect(parseRendimentoPct("")).toBeNull();
    expect(normalizarUnidade("KG")).toBe("kg");
    expect(normalizarUnidade("un.")).toBe("un");
    expect(normalizarUnidade("gramas")).toBe("g");
    expect(normalizarUnidade("xyz")).toBeNull();
    expect(normalizarUnidade(null)).toBeNull();
  });
});
