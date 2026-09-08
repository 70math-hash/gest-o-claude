import { describe, expect, it } from "vitest";
import { parseNumeroBr, diaDeOperacao, formatarData, formatarDataIso, formatarMoeda, formatarNumero, formatarPercentual, formatarPontos, formatarQuantidade, hojeIso, isoDeDataBr, mesDeReferencia, nomeDiaSemana, semanaOperacional } from "./index";

describe("formato brasileiro", () => {
  it("moeda, número e percentual com vírgula", () => {
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56");
    expect(formatarMoeda(null)).toBe("sem dado");
    expect(formatarNumero(1904.76, 1)).toBe("1.904,8");
    expect(formatarPercentual(0.23)).toBe("23,0%");
    expect(formatarPercentual(0.2682, 2)).toBe("26,82%");
    expect(formatarPontos(0.021)).toBe("+2,1 p.p.");
    expect(formatarQuantidade(0.35, "kg")).toBe("350 g");
    expect(formatarQuantidade(1, "un")).toBe("1 un");
  });
  it("datas em dd/mm/aaaa no fuso de São Paulo", () => {
    expect(formatarData(new Date("2026-09-08T01:30:00Z"))).toBe("07/09/2026");
    expect(formatarDataIso("2026-09-08")).toBe("08/09/2026");
    expect(hojeIso(new Date("2026-09-08T01:30:00Z"))).toBe("2026-09-07");
    expect(isoDeDataBr("02/04/2026")).toBe("2026-04-02");
    expect(isoDeDataBr("2/4/26")).toBe("2026-04-02");
  });
  it("lê número brasileiro", () => {
    expect(parseNumeroBr("1.702,00")).toBe(1702);
    expect(parseNumeroBr("R$ 1.234,56")).toBe(1234.56);
    expect(parseNumeroBr("12,5%")).toBe(12.5);
    expect(parseNumeroBr("(1.000,00)")).toBe(-1000);
    expect(parseNumeroBr("-12,5")).toBe(-12.5);
    expect(parseNumeroBr("12.5")).toBe(12.5);
    expect(parseNumeroBr("1.234")).toBe(1234);
    expect(parseNumeroBr("abc")).toBeNull();
    expect(parseNumeroBr("")).toBeNull();
  });
  it("semana operacional de terça a domingo; segunda fechada", () => {
    expect(semanaOperacional("2026-09-10")).toEqual({ inicio: "2026-09-08", fim: "2026-09-13" });
    expect(semanaOperacional("2026-09-13")).toEqual({ inicio: "2026-09-08", fim: "2026-09-13" });
    expect(semanaOperacional("2026-09-14")).toEqual({ inicio: "2026-09-15", fim: "2026-09-20" });
    expect(semanaOperacional("2026-09-08")).toEqual({ inicio: "2026-09-08", fim: "2026-09-13" });
    expect(diaDeOperacao("2026-09-14")).toBe(false);
    expect(nomeDiaSemana("2026-09-08")).toBe("terça");
    expect(mesDeReferencia("2026-02-10")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28", competencia: "02/2026" });
  });
});
