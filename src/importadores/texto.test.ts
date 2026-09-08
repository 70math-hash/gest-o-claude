import { describe, expect, it } from "vitest";
import { ehTotalizador, lerCodigoENome, nomeChave, normalizarChaveColuna, normalizarTexto, removerSufixosOperacionais } from "./texto";

describe("normalização de texto", () => {
  it("maiúsculas, sem acento, espaços colapsados", () => {
    expect(normalizarTexto("  Pão da  Casa ")).toBe("PAO DA CASA");
    expect(normalizarTexto("Rúcola")).toBe("RUCOLA");
    expect(normalizarTexto("FANTÁSTICA")).toBe("FANTASTICA");
    expect(normalizarTexto("Frango com Açafrão")).toBe("FRANGO COM ACAFRAO");
    expect(normalizarTexto(null)).toBe("");
    expect(normalizarTexto(undefined)).toBe("");
  });

  it("chave de coluna ignora pontuação e transforma % em PCT", () => {
    expect(normalizarChaveColuna("Vl. Tabela")).toBe("VL TABELA");
    expect(normalizarChaveColuna("Vl_Tabela")).toBe("VL TABELA");
    expect(normalizarChaveColuna("% Total")).toBe("PCT TOTAL");
    expect(normalizarChaveColuna("%_Total")).toBe("PCT TOTAL");
    expect(normalizarChaveColuna("Total")).toBe("TOTAL");
    expect(normalizarChaveColuna("Cód.")).toBe("COD");
    expect(normalizarChaveColuna("Nº Comanda")).toBe("N COMANDA");
  });

  it("remove sufixos operacionais da seção 6.1", () => {
    expect(removerSufixosOperacionais("STICKS (ENTRADA)")).toBe("STICKS");
    expect(removerSufixosOperacionais("PIZZA ACIDA")).toBe("ACIDA");
    expect(removerSufixosOperacionais("DOCE PAIOLZINHO")).toBe("DOCE");
    expect(removerSufixosOperacionais("BURRATA PIZZA")).toBe("BURRATA");
    expect(removerSufixosOperacionais("Doce (QB)")).toBe("DOCE");
    expect(removerSufixosOperacionais("PIZZA")).toBe("");
  });

  it("nomeChave iguala Altec e catálogo", () => {
    expect(nomeChave("Rúcola")).toBe("RUCOLA");
    expect(nomeChave("RUCOLA")).toBe(nomeChave("Rúcola"));
    expect(nomeChave("Sticks")).toBe(nomeChave("STICKS (ENTRADA)"));
    expect(nomeChave("Chocolate, Azeite e Flor de Sal")).toBe("CHOCOLATE AZEITE E FLOR DE SAL");
    expect(nomeChave("CHOCOLATE, AZEITE E FLOR DE SAL")).toBe(nomeChave("Chocolate, Azeite e Flor de Sal"));
    expect(nomeChave("QTmisu 2.0")).toBe("QTMISU 2 0");
    expect(nomeChave("Pizza Frita Romeu e Julieta")).toBe(nomeChave("PIZZA FRITA ROMEU E JULIETA"));
  });

  it("reconhece totalizadores sem confundir com nomes", () => {
    expect(ehTotalizador("Subtotal PIZZAS")).toBe(true);
    expect(ehTotalizador("Sub-total")).toBe(true);
    expect(ehTotalizador("TOTAL GERAL")).toBe(true);
    expect(ehTotalizador("Total")).toBe(true);
    expect(ehTotalizador("TOTALMENTE")).toBe(false);
    expect(ehTotalizador("MARGHERITA")).toBe(false);
    expect(ehTotalizador("")).toBe(false);
  });

  it("separa código e nome de colaborador", () => {
    expect(lerCodigoENome("", "12 - JOAO")).toEqual({ codigo: "12", nome: "JOAO" });
    expect(lerCodigoENome("12", "JOAO")).toEqual({ codigo: "12", nome: "JOAO" });
    expect(lerCodigoENome("", "JOAO")).toEqual({ codigo: null, nome: "JOAO" });
    expect(lerCodigoENome("", "12")).toEqual({ codigo: "12", nome: null });
    expect(lerCodigoENome("", "")).toEqual({ codigo: null, nome: null });
  });
});
