import { describe, expect, it } from "vitest";
import { parseDataBr, parseHoraBr, parseNumeroBr } from "./numero_br";

describe("parseNumeroBr", () => {
  it("converte o formato brasileiro", () => {
    expect(parseNumeroBr("1.702,00")).toBe(1702);
    expect(parseNumeroBr("R$ 1.234,56")).toBe(1234.56);
    expect(parseNumeroBr("R$1.234")).toBe(1234);
    expect(parseNumeroBr("-12,5")).toBe(-12.5);
    expect(parseNumeroBr("12,5%")).toBe(12.5);
    expect(parseNumeroBr("(1.000,00)")).toBe(-1000);
    expect(parseNumeroBr("1.234.567,89")).toBe(1234567.89);
    expect(parseNumeroBr("R$ -1.234,56")).toBe(-1234.56);
    expect(parseNumeroBr("12,50-")).toBe(-12.5);
    expect(parseNumeroBr(" 1.702,00 ")).toBe(1702);
    expect(parseNumeroBr("0,5")).toBe(0.5);
    expect(parseNumeroBr("12")).toBe(12);
    expect(parseNumeroBr("1.702")).toBe(1702);
  });

  it("aceita o formato americano que o SheetJS produz e número já numérico", () => {
    expect(parseNumeroBr("1,702.50")).toBe(1702.5);
    expect(parseNumeroBr("1,234,567.89")).toBe(1234567.89);
    expect(parseNumeroBr("1702.5")).toBe(1702.5);
    expect(parseNumeroBr("12.50%")).toBe(12.5);
    expect(parseNumeroBr(42)).toBe(42);
    expect(parseNumeroBr(-0.5)).toBe(-0.5);
  });

  it("devolve null para o que não é número, sem inventar zero", () => {
    expect(parseNumeroBr("")).toBeNull();
    expect(parseNumeroBr("   ")).toBeNull();
    expect(parseNumeroBr("abc")).toBeNull();
    expect(parseNumeroBr("12 un")).toBeNull();
    expect(parseNumeroBr("-")).toBeNull();
    expect(parseNumeroBr(null)).toBeNull();
    expect(parseNumeroBr(undefined)).toBeNull();
    expect(parseNumeroBr(Number.NaN)).toBeNull();
    expect(parseNumeroBr({})).toBeNull();
  });
});

describe("parseDataBr", () => {
  it("lê dd/mm/aaaa, dd/mm/aa, ISO e variantes com hora", () => {
    expect(parseDataBr("01/04/2026")).toBe("2026-04-01");
    expect(parseDataBr("1/4/26")).toBe("2026-04-01");
    expect(parseDataBr("01-04-2026")).toBe("2026-04-01");
    expect(parseDataBr("01/04/2026 10:32")).toBe("2026-04-01");
    expect(parseDataBr("2026-04-01")).toBe("2026-04-01");
    expect(parseDataBr("2026-04-01T10:00:00Z")).toBe("2026-04-01");
  });

  it("lê serial de Excel (número ou texto) e Date", () => {
    expect(parseDataBr(46113)).toBe("2026-04-01");
    expect(parseDataBr(46113.5)).toBe("2026-04-01");
    expect(parseDataBr("46113")).toBe("2026-04-01");
    expect(parseDataBr(new Date(Date.UTC(2026, 3, 1)))).toBe("2026-04-01");
    expect(parseDataBr(new Date(2026, 3, 1, 12, 0, 0))).toBe("2026-04-01");
  });

  it("rejeita data inválida", () => {
    expect(parseDataBr("31/02/2026")).toBeNull();
    expect(parseDataBr("13/13/2026")).toBeNull();
    expect(parseDataBr("abc")).toBeNull();
    expect(parseDataBr("")).toBeNull();
    expect(parseDataBr(null)).toBeNull();
    expect(parseDataBr(0)).toBeNull();
    expect(parseDataBr(new Date("x"))).toBeNull();
  });
});

describe("parseHoraBr", () => {
  it("lê hora em texto, data com hora, fração de dia e 19h30", () => {
    expect(parseHoraBr("19:30")).toBe("19:30");
    expect(parseHoraBr("19:30:45")).toBe("19:30");
    expect(parseHoraBr("05/04/2026 21:05")).toBe("21:05");
    expect(parseHoraBr("19h30")).toBe("19:30");
    expect(parseHoraBr(0.8125)).toBe("19:30");
    expect(parseHoraBr("0,8125")).toBe("19:30");
    expect(parseHoraBr(46113.8125)).toBe("19:30");
  });

  it("devolve null sem hora", () => {
    expect(parseHoraBr(46113)).toBeNull();
    expect(parseHoraBr("")).toBeNull();
    expect(parseHoraBr("25:00")).toBeNull();
    expect(parseHoraBr("abc")).toBeNull();
    expect(parseHoraBr(null)).toBeNull();
  });
});
