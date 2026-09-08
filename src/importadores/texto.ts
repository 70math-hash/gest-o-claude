/**
 * Normalização de texto para os importadores (seção 6 da especificação).
 *
 * Tudo que chega de fora (Altec, Santander, planilhas de cadastro) passa por
 * aqui antes de qualquer comparação: maiúsculas, sem acento, espaços
 * colapsados. O mapeamento de produto por nome, fallback do ID Altec na
 * seção 6.1, usa `nomeChave`, que ainda remove os sufixos operacionais
 * "(ENTRADA)", "PIZZA" e "PAIOLZINHO".
 *
 * Funções puras, sem dependência de framework ou banco.
 */

/** Maiúsculas, sem acento (decomposição NFD), espaços colapsados e aparados. */
export function normalizarTexto(texto: string | null | undefined): string {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chave de comparação de cabeçalho de coluna: sem acento, sem pontuação
 * (".", "_", "/", parênteses...), maiúsculas, espaços colapsados.
 * O "%" vira a palavra PCT para "% Total" não colidir com "Total".
 */
export function normalizarChaveColuna(texto: string | null | undefined): string {
  return normalizarTexto(texto)
    .replace(/%/g, " PCT ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras que o Altec acrescenta ao nome do produto e que não fazem parte dele. */
const PREFIXOS_OPERACIONAIS = ["PIZZA"];
const SUFIXOS_OPERACIONAIS = ["PIZZA", "PAIOLZINHO", "ENTRADA", "SOBREMESA"];

const REGEX_PREFIXO = new RegExp(`^(?:${PREFIXOS_OPERACIONAIS.join("|")})(?:\\s+|$)`);
const REGEX_SUFIXO = new RegExp(`(?:^|\\s+)(?:${SUFIXOS_OPERACIONAIS.join("|")})\\s*$`);

/**
 * Remove sufixos operacionais do nome (seção 6.1): grupos entre parênteses
 * como "(ENTRADA)", o prefixo "PIZZA " ("PIZZA ACIDA" → "ACIDA") e os
 * sufixos " PIZZA", " PAIOLZINHO", " ENTRADA" e " SOBREMESA"
 * ("BURRATA PIZZA" → "BURRATA", "DOCE PAIOLZINHO" → "DOCE").
 * Devolve o texto já normalizado por `normalizarTexto`.
 */
export function removerSufixosOperacionais(nome: string | null | undefined): string {
  let texto = normalizarTexto(nome).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  let anterior = "";
  while (anterior !== texto) {
    anterior = texto;
    texto = texto.replace(REGEX_PREFIXO, "").replace(REGEX_SUFIXO, "").replace(/[\s\-:]+$/, "").trim();
  }
  return texto;
}

/**
 * Nome normalizado, sem sufixos operacionais e sem pontuação: chave do
 * fallback de mapeamento por nome. "STICKS (ENTRADA)" e "Sticks" produzem
 * a mesma chave "STICKS"; "RUCOLA" e "Rúcola" produzem "RUCOLA".
 */
export function nomeChave(nome: string | null | undefined): string {
  return removerSufixosOperacionais(nome).replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Verdadeiro para texto de totalizador: "Subtotal", "Sub-total PIZZAS", "Total", "TOTAL GERAL". */
export function ehTotalizador(texto: string | null | undefined): boolean {
  const t = normalizarTexto(texto);
  return /^(?:SUB\s*-?\s*TOTAL|TOTAL)(?:\b|$)/.test(t);
}

/**
 * Código e nome de colaborador que o Altec imprime juntos ("12 - JOAO") ou
 * em colunas separadas. Devolve null no que não veio.
 */
export function lerCodigoENome(codigoTexto: string, nomeTexto: string): { codigo: string | null; nome: string | null } {
  let codigo: string | null = codigoTexto.trim() === "" ? null : codigoTexto.trim();
  let nome: string | null = nomeTexto.trim() === "" ? null : nomeTexto.trim();
  if (nome !== null && codigo === null) {
    const m = /^(\d+)\s*(?:[-–:.]\s*)?(.*)$/.exec(nome);
    if (m && m[1] !== undefined) {
      codigo = m[1];
      const resto = (m[2] ?? "").trim();
      nome = resto === "" ? null : resto;
    }
  }
  return { codigo, nome };
}
