/**
 * Tipos compartilhados dos importadores (seção 6 da especificação).
 *
 * Os importadores são parsers puros: recebem o conteúdo de um arquivo
 * (XLSX, XLS ou CSV) e devolvem estruturas prontas para as tabelas de
 * movimento da seção 4.2 (`importacoes`, `vendas_itens`, `vendas_dia`,
 * `atendimentos`, `despesas`, `conciliacao_dia`). Nada aqui toca banco,
 * React ou Next: a camada de aplicação decide o que gravar.
 *
 * Datas circulam como texto ISO de calendário (aaaa-mm-dd) e valores como
 * número já convertido do formato brasileiro (1.702,00 → 1702).
 */
import type { Bloco, Segmento } from "../motor/tipos";

export type { Bloco, Segmento };

/** Canal de venda registrado em `vendas_itens.canal`. */
export type Canal = "salao" | "delivery";

/** Tipos de importação da tabela `importacoes`. */
export type TipoImportacao = "altec_r3" | "altec_dia" | "santander" | "comanda";

/** Período coberto pelo arquivo, em ISO aaaa-mm-dd, inclusivo nas duas pontas. */
export interface Periodo {
  inicio: string;
  fim: string;
}

/** Arquivo recebido pela tela de importação: nome (para a extensão) e conteúdo bruto. */
export interface ArquivoEntrada {
  nome: string;
  conteudo: Uint8Array | ArrayBuffer | string;
}

export type FormatoArquivo = "xlsx" | "xls" | "csv" | "html";

export type Codificacao = "utf-8" | "utf-16" | "windows-1252";

/** Faixa de linhas de `Tabela.linhas` que veio de uma aba (planilha) ou do arquivo inteiro (CSV). `fim` é exclusivo. */
export interface AbaTabela {
  nome: string;
  inicio: number;
  fim: number;
}

/** Matriz de células como texto, todas as abas concatenadas na ordem do arquivo. */
export interface Tabela {
  linhas: string[][];
  abas?: AbaTabela[];
  formato?: FormatoArquivo;
  codificacao?: Codificacao;
}

/** Mapa nome canônico da coluna → índice na linha de cabeçalho. */
export type MapaColunas = Record<string, number>;
