import { describe, expect, it } from "vitest";
import { hashArquivo } from "./hash";

describe("hashArquivo", () => {
  it("é idempotente: mesmo conteúdo, mesmo hash; conteúdo diferente, hash diferente", async () => {
    const a = await hashArquivo("Categoria;ID;Produto\nPIZZAS;100011;MARGHERITA\n");
    const b = await hashArquivo("Categoria;ID;Produto\nPIZZAS;100011;MARGHERITA\n");
    const c = await hashArquivo("Categoria;ID;Produto\nPIZZAS;100011;MARGHERITA \n");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("texto e seus bytes UTF-8 produzem o mesmo hash; ArrayBuffer também", async () => {
    const texto = "Pão da Casa;69,00";
    const bytes = new TextEncoder().encode(texto);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    expect(await hashArquivo(bytes)).toBe(await hashArquivo(texto));
    expect(await hashArquivo(buffer)).toBe(await hashArquivo(texto));
  });

  it("bate com o vetor conhecido de SHA-256", async () => {
    expect(await hashArquivo("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
