/**
 * Importador do extrato Santander em CSV ou XLS/XLSX (seção 6.3 da
 * especificação).
 *
 * Detecta a primeira linha da tabela ignorando os metadados do topo: é a
 * linha de cabeçalho que contém "Data" e "Descrição", "Lançamento" ou
 * "Histórico" (mais uma coluna de valor). Colunas: Data, Descrição, Valor,
 * Tipo (D ou C) e Saldo. Sem coluna Tipo, o sinal do valor decide (negativo
 * é débito); extratos com "Débito" e "Crédito" em colunas separadas também
 * são aceitos.
 *
 * Débitos viram candidatos a despesas e a `descricaoChave` (descrição sem
 * números, datas e documentos) é a chave da regra de classificação
 * aprendida das confirmações anteriores; nada é classificado sem confirmação
 * humana na primeira vez (seção 6.3). Créditos ganham `origemCredito`
 * (adquirente, marketplace, pix, outro) para alimentar `conciliacao_dia`.
 */
import { arredondar } from "../motor/numero";
import { numeroOuNull } from "./altec_r3";
import { parseDataBr, parseNumeroBr } from "./numero_br";
import { celula, detectarCabecalhoPorColunas, linhaVazia } from "./tabela";
import { normalizarTexto } from "./texto";
import type { MapaColunas, Periodo, Tabela } from "./tipos";

export const SINONIMOS_SANTANDER: Record<string, string[]> = {
  data: ["Data", "Data Lançamento", "Data Lancamento", "Data Mov", "Data Movimento", "Dt", "Dt. Lançamento", "Data do Lançamento", "Data de Lançamento"],
  descricao: [
    "Descrição", "Descricao", "Lançamento", "Lancamento", "Histórico", "Historico", "Descrição do Lançamento", "Descrição Lançamento",
    "Histórico do Lançamento", "Memo", "Descrição da Transação",
  ],
  documento: ["Documento", "Doc", "Docto", "Nº Documento", "Num Documento", "Número do Documento", "Nº Doc", "Doc."],
  tipo: ["Tipo", "D/C", "DC", "Natureza", "Débito/Crédito", "Debito/Credito", "Tipo Lançamento", "Tipo de Lançamento", "Sinal", "Tipo Mov"],
  debito: ["Débito", "Debito", "Débitos", "Debitos", "Valor Débito", "Vl Débito", "Saídas", "Saidas", "Saída", "Saida"],
  credito: ["Crédito", "Credito", "Créditos", "Creditos", "Valor Crédito", "Vl Crédito", "Entradas", "Entrada"],
  valor: ["Valor", "Valor (R$)", "Vlr", "Vlr (R$)", "Montante", "Valor Lançamento", "Valor do Lançamento", "Vl. Lançamento"],
  saldo: ["Saldo", "Saldo (R$)", "Saldo Atual", "Saldo Após", "Saldo Apos", "Saldo Após Lançamento"],
};

export type TipoLancamento = "D" | "C";
export type OrigemCredito = "adquirente" | "marketplace" | "pix" | "outro";

export interface LancamentoSantander {
  linha: number;
  /** ISO aaaa-mm-dd. */
  data: string;
  descricao: string;
  /** Descrição normalizada sem números, datas e documentos: chave da regra de classificação aprendida. */
  descricaoChave: string;
  /** Sempre positivo; `tipo` diz o sentido. */
  valor: number;
  tipo: TipoLancamento;
  saldo: number | null;
  documento: string | null;
  origemCredito: OrigemCredito;
}

export interface ResultadoSantander {
  lancamentos: LancamentoSantander[];
  periodo: Periodo | null;
  avisos: string[];
  linhasLidas: number;
  linhasIgnoradas: number;
  totalDebitos: number;
  totalCreditos: number;
  colunas: MapaColunas;
}

/** Lê o extrato já convertido em tabela de texto (ver `lerTabela`). */
export function lerExtratoSantander(entrada: Tabela | string[][]): ResultadoSantander {
  const linhas = Array.isArray(entrada) ? entrada : entrada.linhas;
  const avisos: string[] = [];
  const base: ResultadoSantander = { lancamentos: [], periodo: null, avisos, linhasLidas: 0, linhasIgnoradas: 0, totalDebitos: 0, totalCreditos: 0, colunas: {} };

  let cabecalho = detectarCabecalhoPorColunas(linhas, SINONIMOS_SANTANDER, [["data"], ["descricao"], ["valor", "debito", "credito"]], 300);
  if (!cabecalho) {
    cabecalho = detectarCabecalhoPorColunas(linhas, SINONIMOS_SANTANDER, [["data"], ["descricao"]], 300);
    if (cabecalho) avisos.push("Cabeçalho do extrato sem coluna de valor reconhecida; nenhum lançamento pode ser lido.");
  }
  if (!cabecalho) {
    avisos.push('Cabeçalho do extrato não encontrado: nenhuma linha com "Data" e "Descrição", "Lançamento" ou "Histórico".');
    return base;
  }
  const { indice, colunas } = cabecalho;
  base.colunas = colunas;
  const temDebitoCredito = colunas.debito !== undefined || colunas.credito !== undefined;

  const lancamentos: LancamentoSantander[] = [];
  let lidas = 0;
  let ignoradas = 0;
  let totalDebitos = 0;
  let totalCreditos = 0;

  for (let i = indice + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    lidas++;

    const data = parseDataBr(celula(linha, colunas.data));
    if (!data) {
      // Saldo anterior, totais e rodapés não têm data.
      ignoradas++;
      continue;
    }
    const descricao = celula(linha, colunas.descricao);

    let valor: number | null = null;
    let tipo: TipoLancamento | null = null;

    if (temDebitoCredito) {
      const debito = numeroOuNull(linha, colunas.debito);
      const credito = numeroOuNull(linha, colunas.credito);
      if (debito !== null && debito !== 0) {
        valor = Math.abs(debito);
        tipo = "D";
      } else if (credito !== null && credito !== 0) {
        valor = Math.abs(credito);
        tipo = "C";
      }
    }

    if (valor === null && colunas.valor !== undefined) {
      let textoValor = celula(linha, colunas.valor);
      let letra: string | null = null;
      const comLetra = /^(.*?)\s*([DC])$/i.exec(textoValor);
      if (comLetra && comLetra[1] !== undefined && comLetra[2] !== undefined && parseNumeroBr(comLetra[1]) !== null) {
        textoValor = comLetra[1];
        letra = comLetra[2].toUpperCase();
      }
      const lido = parseNumeroBr(textoValor);
      if (lido !== null) {
        const tipoTexto = colunas.tipo !== undefined ? normalizarTexto(celula(linha, colunas.tipo)) : (letra ?? "");
        if (tipoTexto.startsWith("D") || tipoTexto === "-") tipo = "D";
        else if (tipoTexto.startsWith("C") || tipoTexto === "+") tipo = "C";
        else tipo = lido < 0 ? "D" : "C";
        valor = Math.abs(lido);
      }
    }

    if (valor === null || tipo === null) {
      avisos.push(`Linha ${i + 1} ignorada: sem valor numérico em "${descricao}".`);
      ignoradas++;
      continue;
    }

    if (tipo === "D") totalDebitos += valor;
    else totalCreditos += valor;

    lancamentos.push({
      linha: i + 1,
      data,
      descricao,
      descricaoChave: chaveDescricao(descricao),
      valor,
      tipo,
      saldo: numeroOuNull(linha, colunas.saldo),
      documento: celula(linha, colunas.documento) || null,
      origemCredito: classificarOrigemCredito(descricao),
    });
  }

  const datas = lancamentos.map((l) => l.data).sort();
  const primeira = datas[0];
  const ultima = datas[datas.length - 1];
  const periodo: Periodo | null = primeira !== undefined && ultima !== undefined ? { inicio: primeira, fim: ultima } : null;
  if (lancamentos.length === 0) avisos.push("Nenhum lançamento com data e valor encontrado abaixo do cabeçalho.");

  return {
    lancamentos,
    periodo,
    avisos,
    linhasLidas: lidas,
    linhasIgnoradas: ignoradas,
    totalDebitos: arredondar(totalDebitos, 2),
    totalCreditos: arredondar(totalCreditos, 2),
    colunas,
  };
}

/**
 * Chave de classificação: descrição normalizada sem tokens com dígito
 * (datas, documentos, CPF/CNPJ, códigos) e sem pontuação, para a mesma
 * despesa recorrente cair sempre na mesma regra.
 */
export function chaveDescricao(descricao: string): string {
  return normalizarTexto(descricao)
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(" ")
    .filter((token) => token !== "" && !/\d/.test(token))
    .join(" ");
}

const TOKENS_ADQUIRENTE = ["REDE", "CIELO", "STONE", "GETNET", "PAGSEGURO", "SAFRAPAY", "PAGBANK", "SUMUP", "MERCADOPAGO"];
const FRASES_ADQUIRENTE = [/\bPAG SEGURO\b/, /\bSAFRA PAY\b/, /\bMERCADO PAGO\b/];
const TOKENS_MARKETPLACE = ["IFOOD", "RAPPI", "99FOOD", "KEETA"];
const FRASES_MARKETPLACE = [/\b99 FOOD\b/];

/** Origem do crédito por palavra-chave na descrição (seção 6.3): adquirente, marketplace, pix ou outro. */
export function classificarOrigemCredito(descricao: string): OrigemCredito {
  const texto = normalizarTexto(descricao).replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const tokens = texto.split(" ");
  if (tokens.some((t) => TOKENS_ADQUIRENTE.includes(t)) || FRASES_ADQUIRENTE.some((f) => f.test(texto))) return "adquirente";
  if (tokens.some((t) => TOKENS_MARKETPLACE.includes(t)) || FRASES_MARKETPLACE.some((f) => f.test(texto))) return "marketplace";
  if (tokens.includes("PIX")) return "pix";
  return "outro";
}
