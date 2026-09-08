/**
 * Gera uma pasta de trabalho XLSX em memória a partir de matrizes, para os
 * testes provarem o caminho de planilha sem depender de arquivo em disco.
 */
import * as XLSX from "xlsx";

export interface AbaMatriz {
  nome: string;
  linhas: Array<Array<string | number>>;
}

/** Devolve os bytes do XLSX como ArrayBuffer, que é o que `XLSX.write(..., { type: "array" })` produz. */
export function xlsxDe(abas: AbaMatriz[]): ArrayBuffer {
  const pasta = XLSX.utils.book_new();
  for (const aba of abas) XLSX.utils.book_append_sheet(pasta, XLSX.utils.aoa_to_sheet(aba.linhas), aba.nome);
  const saida: unknown = XLSX.write(pasta, { type: "array", bookType: "xlsx" });
  if (saida instanceof ArrayBuffer) return saida;
  if (saida instanceof Uint8Array) {
    const copia = new Uint8Array(saida.byteLength);
    copia.set(saida);
    return copia.buffer;
  }
  throw new Error("XLSX.write não devolveu bytes");
}

/** Codifica texto em Windows-1252 (só caracteres até U+00FF), simulando exportação brasileira antiga. */
export function latin1(texto: string): Uint8Array {
  return Uint8Array.from(texto, (ch) => {
    const codigo = ch.charCodeAt(0);
    if (codigo > 0xff) throw new Error(`caractere fora do Latin-1: ${ch}`);
    return codigo;
  });
}
