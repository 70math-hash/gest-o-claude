/**
 * Hash SHA-256 do arquivo importado (seção 6.1 e tabela `importacoes` da
 * seção 4.2): toda importação é idempotente por hash. Arquivo com o mesmo
 * conteúdo produz o mesmo hash e a reimportação é rejeitada (seção 8).
 *
 * Usa Web Crypto (`crypto.subtle`), disponível no Node 22, no navegador e
 * no Next, sem dependência.
 */

/** SHA-256 em hexadecimal minúsculo do conteúdo (texto é codificado em UTF-8). */
export async function hashArquivo(conteudo: Uint8Array | ArrayBuffer | string): Promise<string> {
  const bytes = paraBytes(conteudo);
  // Cópia em ArrayBuffer próprio: o Web Crypto não aceita views sobre SharedArrayBuffer.
  const copia = new Uint8Array(bytes.byteLength);
  copia.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copia);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normaliza o conteúdo recebido para bytes. Texto vira UTF-8. */
export function paraBytes(conteudo: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof conteudo === "string") return new TextEncoder().encode(conteudo);
  if (conteudo instanceof Uint8Array) return conteudo;
  return new Uint8Array(conteudo);
}
