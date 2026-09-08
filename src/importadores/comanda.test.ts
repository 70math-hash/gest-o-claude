import { describe, expect, it } from "vitest";
import { lerComandas } from "./comanda";
import { COMANDA_CSV, MESA_CSV } from "./fixtures/comanda";
import { lerTabela } from "./tabela";

describe("lerComandas por comanda", () => {
  const resultado = lerComandas(lerTabela({ nome: "comandas.csv", conteudo: COMANDA_CSV }));
  const porComanda = (c: string) => resultado.atendimentos.find((a) => a.comanda === c);

  it("agrupa itens por comanda e deriva as flags de attach da categoria", () => {
    expect(resultado.atendimentos).toHaveLength(3);
    expect(resultado.itens).toHaveLength(5);
    expect(porComanda("1001")).toMatchObject({
      data: "2026-04-05",
      mesa: "12",
      clientes: 2,
      chegada: "19:30",
      saida: "21:05",
      teveEntrada: true,
      teveSobremesa: false,
      teveBebida: true,
      garcomCodigo: "12",
      garcomNome: "JOAO",
      total: 186,
      itens: 3,
    });
  });

  it("linha de item sem comanda pertence ao último atendimento", () => {
    expect(porComanda("1002")).toMatchObject({ mesa: "7", clientes: 4, teveEntrada: false, teveSobremesa: true, teveBebida: false, total: 180, itens: 2, garcomCodigo: "15", garcomNome: "MARIA" });
  });

  it("sem itens, as flags e o total ficam sem dado", () => {
    expect(porComanda("1003")).toMatchObject({ mesa: "3", clientes: 2, chegada: "20:15", saida: null, teveEntrada: null, teveSobremesa: null, teveBebida: null, total: null, itens: 0 });
  });
});

describe("lerComandas por mesa, sem comanda e sem categoria", () => {
  const resultado = lerComandas(lerTabela({ nome: "mesas.csv", conteudo: MESA_CSV }));

  it("agrupa por mesa e abertura, e avisa que as flags ficam sem dado", () => {
    expect(resultado.avisos.some((a) => a.includes("Sem coluna de categoria"))).toBe(true);
    expect(resultado.atendimentos.map((a) => [a.mesa, a.chegada, a.saida, a.clientes, a.total, a.itens, a.teveBebida])).toEqual([
      ["5", "19:00", "20:30", 3, 100, 2, null],
      ["5", "21:00", "22:10", 2, 75, 1, null],
    ]);
    expect(resultado.atendimentos[0]?.comanda).toBeNull();
  });

  it("sem cabeçalho devolve vazio com aviso", () => {
    const vazio = lerComandas([["nada"], ["1", "2"]]);
    expect(vazio.atendimentos).toEqual([]);
    expect(vazio.avisos[0]).toMatch(/Cabeçalho da exportação por comanda não encontrado/);
  });
});
