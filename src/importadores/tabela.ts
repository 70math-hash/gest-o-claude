/**
 * Leitura de arquivo tabular (XLSX, XLS, CSV, TXT) para uma matriz de
 * texto, mais as utilidades de cabeçalho que todos os importadores da
 * seção 6 usam.
 *
 * - `lerTabela` decide o formato pela assinatura dos bytes (ZIP para xlsx,
 *   OLE para xls) e pela extensão; planilhas passam pelo SheetJS com todas
 *   as abas concatenadas na ordem, a primeira primeiro; CSV/TXT passa por um
 *   parser próprio (separador ";" ou "," detectado, aspas com escape, CRLF
 *   ou LF, BOM) depois de decodificar UTF-8 com fallback para Windows-1252,
 *   que é a codificação usual das exportações brasileiras.
 * - `detectarCabecalho` acha a linha de cabeçalho real pulando o cabeçalho
 *   institucional; `mapearColunas` traduz os nomes de coluna (com sinônimos)
 *   para índices.
 *
 * Observação sobre o SheetJS: com `raw: false` ele formata números com
 * separadores americanos ("1,702.50") em qualquer locale. Por isso as
 * células numéricas de planilha saem daqui em forma canônica brasileira sem
 * milhar ("1702,5"); células com data, hora ou percentual mantêm o texto
 * formatado, que `parseDataBr` e `parseNumeroBr` entendem. Um XLS que na
 * verdade é HTML (exportação de internet banking) é lido como texto puro,
 * sem o SheetJS reinterpretar datas e números brasileiros.
 */
import * as XLSX from "xlsx";
import { paraBytes } from "./hash";
import { normalizarChaveColuna } from "./texto";
import type { AbaTabela, ArquivoEntrada, Codificacao, FormatoArquivo, MapaColunas, Tabela } from "./tipos";

export type { Tabela } from "./tipos";

/** Lê o arquivo e devolve as linhas como matriz de strings. */
export function lerTabela(arquivo: ArquivoEntrada): Tabela {
  const extensao = extensaoDe(arquivo.nome);

  if (typeof arquivo.conteudo === "string") {
    if (pareceHtml(arquivo.conteudo)) return lerPlanilha(arquivo.conteudo, "html");
    return tabelaDeCsv(arquivo.conteudo, arquivo.nome, "utf-8");
  }

  const bytes = paraBytes(arquivo.conteudo);
  const assinatura = detectarAssinatura(bytes);
  if (assinatura) return lerPlanilha(bytes, assinatura);

  const { texto, codificacao } = decodificarTexto(bytes);
  if (pareceHtml(texto)) return lerPlanilha(texto, "html", codificacao);
  if (extensao === "xlsx" || extensao === "xlsm" || extensao === "xls") {
    // Extensão de planilha sem assinatura conhecida: tentar o SheetJS; se falhar, tratar como texto.
    try {
      return lerPlanilha(bytes, extensao === "xls" ? "xls" : "xlsx");
    } catch {
      /* segue como CSV */
    }
  }
  return tabelaDeCsv(texto, arquivo.nome, codificacao);
}

function extensaoDe(nome: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(nome.trim());
  return m && m[1] ? m[1].toLowerCase() : "";
}

/** "PK.." é ZIP (xlsx/xlsm); "D0 CF 11 E0 A1 B1 1A E1" é OLE (xls). */
function detectarAssinatura(bytes: Uint8Array): "xlsx" | "xls" | null {
  const b = (i: number): number => bytes[i] ?? -1;
  if (b(0) === 0x50 && b(1) === 0x4b && [0x03, 0x05, 0x07].includes(b(2)) && [0x04, 0x06, 0x08].includes(b(3))) return "xlsx";
  if (b(0) === 0xd0 && b(1) === 0xcf && b(2) === 0x11 && b(3) === 0xe0 && b(4) === 0xa1 && b(5) === 0xb1 && b(6) === 0x1a && b(7) === 0xe1) return "xls";
  return null;
}

function pareceHtml(texto: string): boolean {
  return /^\s*(?:<!doctype\s+html|<html|<table|<\?xml)/i.test(texto.slice(0, 512));
}

/** Decodifica bytes de texto: BOM UTF-16, UTF-8 estrito e, se falhar, Windows-1252. */
export function decodificarTexto(bytes: Uint8Array): { texto: string; codificacao: Codificacao } {
  const b0 = bytes[0];
  const b1 = bytes[1];
  if (b0 === 0xff && b1 === 0xfe) return { texto: new TextDecoder("utf-16le").decode(bytes), codificacao: "utf-16" };
  if (b0 === 0xfe && b1 === 0xff) {
    try {
      return { texto: new TextDecoder("utf-16be").decode(bytes), codificacao: "utf-16" };
    } catch {
      /* sem suporte a utf-16be: segue para utf-8 */
    }
  }
  try {
    return { texto: new TextDecoder("utf-8", { fatal: true }).decode(bytes), codificacao: "utf-8" };
  } catch {
    return { texto: new TextDecoder("windows-1252").decode(bytes), codificacao: "windows-1252" };
  }
}

function tabelaDeCsv(texto: string, nome: string, codificacao: Codificacao): Tabela {
  const linhas = lerCsv(texto);
  const nomeAba = nome.replace(/\.[a-z0-9]+$/i, "") || "csv";
  return { linhas, abas: [{ nome: nomeAba, inicio: 0, fim: linhas.length }], formato: "csv", codificacao };
}

function lerPlanilha(dados: Uint8Array | string, formato: FormatoArquivo, codificacao?: Codificacao): Tabela {
  // Texto (HTML disfarçado de XLS) entra com raw: true para o SheetJS não reinterpretar
  // "01/04/2026" como data americana; planilha binária entra com raw: false, como manda a seção 6.
  const pasta =
    typeof dados === "string"
      ? XLSX.read(dados, { type: "string", cellDates: false, raw: true })
      : XLSX.read(dados, { type: "array", cellDates: false, raw: false });
  const linhas: string[][] = [];
  const abas: AbaTabela[] = [];
  for (const nomeAba of pasta.SheetNames) {
    const aba = pasta.Sheets[nomeAba];
    if (!aba) continue;
    const formatadas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: false, defval: "" });
    const valores = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true, defval: "" });
    const inicio = linhas.length;
    formatadas.forEach((linha, i) => {
      const brutos = valores[i] ?? [];
      linhas.push(linha.map((celulaFormatada, j) => textoDeCelula(celulaFormatada, brutos[j])));
    });
    abas.push({ nome: nomeAba, inicio, fim: linhas.length });
  }
  const tabela: Tabela = { linhas, abas, formato };
  if (codificacao) tabela.codificacao = codificacao;
  return tabela;
}

/** Texto da célula: número vira forma canônica brasileira; data, hora e percentual mantêm o formato. */
function textoDeCelula(formatada: unknown, bruta: unknown): string {
  const texto = formatada === null || formatada === undefined ? "" : String(formatada).trim();
  if (typeof bruta === "number" && Number.isFinite(bruta) && !/[/:%]/.test(texto)) return numeroCanonico(bruta);
  return texto;
}

/** 1702.5 → "1702,5"; sem milhar, sem ruído de ponto flutuante. */
export function numeroCanonico(numero: number): string {
  const texto = Math.abs(numero) < 1e15 ? String(Number(numero.toFixed(10))) : String(numero);
  return texto.replace(".", ",");
}

const SEPARADORES_CANDIDATOS = [";", ",", "\t", "|"];

/**
 * Detecta o separador do CSV olhando as primeiras linhas (o cabeçalho
 * institucional do Altec inclusive): vence o candidato mais consistente,
 * isto é, o que aparece o mesmo número de vezes em mais linhas. Vírgula
 * decimal dentro dos números não é consistente e perde para o ";".
 */
export function detectarSeparador(texto: string): string {
  const linhas = texto
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim() !== "")
    .slice(0, 40);
  let melhor = ";";
  let melhorPontuacao = -1;
  for (const candidato of SEPARADORES_CANDIDATOS) {
    const contagens = linhas.map((l) => contarForaDeAspas(l, candidato)).filter((c) => c > 0);
    if (contagens.length === 0) continue;
    const frequencia = new Map<number, number>();
    for (const c of contagens) frequencia.set(c, (frequencia.get(c) ?? 0) + 1);
    const consistencia = Math.max(...frequencia.values());
    const total = contagens.reduce((soma, c) => soma + c, 0);
    const pontuacao = consistencia * 1000 + contagens.length * 10 + Math.min(total, 9);
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = candidato;
    }
  }
  return melhor;
}

function contarForaDeAspas(linha: string, separador: string): number {
  let total = 0;
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha.charAt(i);
    if (ch === '"') entreAspas = !entreAspas;
    else if (!entreAspas && ch === separador) total++;
  }
  return total;
}

/** Parser de CSV: separador detectado (ou informado), aspas duplas com escape "", CRLF/LF/CR, BOM. Células aparadas. */
export function lerCsv(texto: string, separador?: string): string[][] {
  const conteudo = texto.replace(/^\ufeff/, "");
  const sep = separador ?? detectarSeparador(conteudo);
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;
  let campoComAspas = false;

  const fecharCampo = (): void => {
    linha.push(campo.trim());
    campo = "";
    campoComAspas = false;
  };
  const fecharLinha = (): void => {
    fecharCampo();
    linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < conteudo.length; i++) {
    const ch = conteudo.charAt(i);
    if (entreAspas) {
      if (ch === '"') {
        if (conteudo.charAt(i + 1) === '"') {
          campo += '"';
          i++;
        } else {
          entreAspas = false;
        }
      } else {
        campo += ch;
      }
      continue;
    }
    if (ch === '"' && campo.trim() === "" && !campoComAspas) {
      entreAspas = true;
      campoComAspas = true;
      campo = "";
    } else if (ch === sep) {
      fecharCampo();
    } else if (ch === "\r") {
      if (conteudo.charAt(i + 1) === "\n") i++;
      fecharLinha();
    } else if (ch === "\n") {
      fecharLinha();
    } else {
      campo += ch;
    }
  }
  if (campo !== "" || linha.length > 0 || campoComAspas) fecharLinha();

  // Linha final vazia (arquivo terminado em quebra de linha) não é dado.
  while (linhas.length > 0 && linhaVazia(linhas[linhas.length - 1] ?? [])) linhas.pop();
  return linhas;
}

/** Célula aparada no índice, ou "" quando a coluna não existe. */
export function celula(linha: string[] | undefined, indice: number | undefined): string {
  if (!linha || indice === undefined) return "";
  return (linha[indice] ?? "").trim();
}

export function linhaVazia(linha: string[]): boolean {
  return linha.every((c) => c.trim() === "");
}

export interface OpcoesCabecalho {
  /** Além da coluna obrigatória, a linha precisa ter pelo menos uma destas (igual ou prefixo). */
  exigirTambem?: string[];
  /** Quantas linhas examinar; padrão, todas. */
  maxLinhas?: number;
}

/**
 * Índice da primeira linha que contém uma célula cujo texto normalizado é
 * igual à coluna obrigatória; se nenhuma for igual, a primeira cujo texto
 * começa com ela. Null quando não há cabeçalho.
 */
export function detectarCabecalho(linhas: string[][], colunaObrigatoria: string, opcoes: OpcoesCabecalho = {}): number | null {
  const alvo = normalizarChaveColuna(colunaObrigatoria);
  if (alvo === "") return null;
  const tambem = (opcoes.exigirTambem ?? []).map(normalizarChaveColuna).filter((t) => t !== "");
  const limite = Math.min(linhas.length, opcoes.maxLinhas ?? linhas.length);
  let porPrefixo: number | null = null;
  for (let i = 0; i < limite; i++) {
    const chaves = (linhas[i] ?? []).map(normalizarChaveColuna);
    const temOutras = tambem.length === 0 || tambem.some((t) => chaves.some((c) => c === t || c.startsWith(`${t} `)));
    if (!temOutras) continue;
    if (chaves.includes(alvo)) return i;
    if (porPrefixo === null && chaves.some((c) => c.startsWith(alvo))) porPrefixo = i;
  }
  return porPrefixo;
}

/**
 * Mapa nome canônico → índice da coluna. Compara os textos normalizados
 * (`normalizarChaveColuna`) do cabeçalho com o próprio nome canônico e os
 * sinônimos; cada coluna é reivindicada uma vez só, na ordem em que os
 * nomes canônicos aparecem. Primeiro por igualdade; o que sobrar tenta
 * prefixo de palavra ("Vl Tabela" casa "Vl Tabela Unit").
 */
export function mapearColunas(cabecalho: string[], sinonimos: Record<string, string[]>): MapaColunas {
  const chaves = cabecalho.map(normalizarChaveColuna);
  const usadas = new Set<number>();
  const mapa: MapaColunas = {};
  const alvosDe = (canonico: string, lista: string[]): string[] =>
    [canonico, ...lista].map(normalizarChaveColuna).filter((a) => a !== "");

  for (const [canonico, lista] of Object.entries(sinonimos)) {
    const alvos = alvosDe(canonico, lista);
    const indice = chaves.findIndex((c, i) => !usadas.has(i) && c !== "" && alvos.includes(c));
    if (indice >= 0) {
      mapa[canonico] = indice;
      usadas.add(indice);
    }
  }
  for (const [canonico, lista] of Object.entries(sinonimos)) {
    if (canonico in mapa) continue;
    const alvos = alvosDe(canonico, lista);
    const indice = chaves.findIndex((c, i) => !usadas.has(i) && c !== "" && alvos.some((a) => c.startsWith(`${a} `)));
    if (indice >= 0) {
      mapa[canonico] = indice;
      usadas.add(indice);
    }
  }
  return mapa;
}

/**
 * Acha a linha de cabeçalho pelo conjunto de colunas: a primeira linha
 * (entre as `maxLinhas` iniciais) em que cada grupo de `grupos` tem pelo
 * menos um nome canônico mapeado. Devolve o índice e o mapa de colunas.
 */
export function detectarCabecalhoPorColunas(
  linhas: string[][],
  sinonimos: Record<string, string[]>,
  grupos: string[][],
  maxLinhas = 80,
): { indice: number; colunas: MapaColunas } | null {
  const limite = Math.min(linhas.length, maxLinhas);
  for (let i = 0; i < limite; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    const colunas = mapearColunas(linha, sinonimos);
    if (grupos.every((grupo) => grupo.some((nome) => nome in colunas))) return { indice: i, colunas };
  }
  return null;
}
