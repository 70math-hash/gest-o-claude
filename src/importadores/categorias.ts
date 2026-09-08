/**
 * Classificação de categoria e grupo do Altec em bloco, segmento e canal.
 *
 * Usada pelos três importadores Altec: o R3 precisa do bloco (pizza,
 * entrada, sobremesa, bar, salão; seção 6.1), a venda do dia precisa do
 * segmento (cozinha, salão, bar, delivery; seção 6.2) e a exportação por
 * comanda precisa saber se o item é entrada, sobremesa ou bebida (attach,
 * seção 5.8). Categoria desconhecida devolve null e vai para a fila de
 * classificação manual; nada é adivinhado (regra 10).
 */
import { normalizarTexto } from "./texto";
import type { Bloco, Canal, Segmento } from "./tipos";

export interface ClassificacaoCategoria {
  bloco: Bloco | null;
  segmento: Segmento | null;
  canal: Canal;
}

/** Palavras (ou prefixos de palavra) que identificam cada grupo. Sempre comparadas sem acento e em maiúsculas. */
const PREFIXOS_DELIVERY = ["DELIVERY", "TELE", "IFOOD", "RAPPI", "KEETA", "99FOOD"];
const PREFIXOS_PIZZA = ["PIZZA"];
const PREFIXOS_ENTRADA = ["ENTRADA"];
const PREFIXOS_SOBREMESA = ["SOBREMESA", "DOCES"];
const PREFIXOS_BAR = ["DRINK", "COQUETE", "CAIPIRINHA", "CAIPIROSKA"];
const PALAVRAS_BAR = ["BAR"];
const PREFIXOS_SALAO = ["VINHO", "CERVEJA", "REFRIGERANTE", "SUCO", "BEBIDA", "ESPUMANTE", "CHOPP", "CHOPE"];
const PALAVRAS_SALAO = ["AGUA", "AGUAS", "SALAO"];
const PREFIXOS_COZINHA = ["JANTAR", "COZINHA", "PRATO", "ALMOCO", "MASSA", "RISOTO"];

function palavrasDe(texto: string): string[] {
  return normalizarTexto(texto).replace(/[^A-Z0-9 ]+/g, " ").split(" ").filter((p) => p !== "");
}

function temPrefixo(palavras: string[], prefixos: string[]): boolean {
  return palavras.some((p) => prefixos.some((prefixo) => p.startsWith(prefixo)));
}

function temPalavra(palavras: string[], lista: string[]): boolean {
  return palavras.some((p) => lista.includes(p));
}

/** Classifica o texto de categoria (R3) ou grupo (venda do dia) do Altec. */
export function classificarCategoria(texto: string | null | undefined): ClassificacaoCategoria {
  const palavras = palavrasDe(texto ?? "");
  const junto = palavras.join(" ");

  const delivery = temPrefixo(palavras, PREFIXOS_DELIVERY) || /\b99 FOOD\b/.test(junto);
  const canal: Canal = delivery ? "delivery" : "salao";

  let bloco: Bloco | null = null;
  if (/\bQUEIJOS? BRASILEIROS?\b/.test(junto) || temPalavra(palavras, ["QB"])) bloco = "pizza";
  else if (temPrefixo(palavras, PREFIXOS_PIZZA)) bloco = "pizza";
  else if (temPrefixo(palavras, PREFIXOS_ENTRADA)) bloco = "entrada";
  else if (temPrefixo(palavras, PREFIXOS_SOBREMESA)) bloco = "sobremesa";
  else if (temPrefixo(palavras, PREFIXOS_BAR) || temPalavra(palavras, PALAVRAS_BAR)) bloco = "bar";
  else if (temPrefixo(palavras, PREFIXOS_SALAO) || temPalavra(palavras, PALAVRAS_SALAO) || /\b(?:NAO|SEM) ALCOOL/.test(junto)) bloco = "salao";

  let segmento: Segmento | null = null;
  if (delivery) segmento = "delivery";
  else if (bloco === "pizza" || bloco === "entrada" || bloco === "sobremesa") segmento = "cozinha";
  else if (bloco === "bar") segmento = "bar";
  else if (bloco === "salao") segmento = "salao";
  else if (temPrefixo(palavras, PREFIXOS_COZINHA)) segmento = "cozinha";

  return { bloco, segmento, canal };
}

/** Verdadeiro quando o texto identifica a taxa de serviço lançada como item ou grupo. */
export function ehTaxaServico(texto: string | null | undefined): boolean {
  const t = normalizarTexto(texto);
  if (t === "") return false;
  return /\bTAXA DE SERVICO\b|\bTX\.? ?(?:DE )?SERVICO\b|\bGORJETA\b|^SERVICO$|^TAXA SERVICO$|\b1[03] ?%/.test(t);
}
