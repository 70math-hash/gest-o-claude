/**
 * Tipos compartilhados do motor de cálculo (seção 5).
 * Tudo em português, unidades explícitas, percentuais como fração.
 */

/** Unidade em que o insumo é precificado e estocado (preço por kg, por litro ou por unidade). */
export type UnidadeBase = "kg" | "l" | "un";

/** Unidade em que a gramagem é pesada na ficha. */
export type UnidadeFicha = "g" | "kg" | "ml" | "l" | "un";

export type Bloco = "pizza" | "entrada" | "sobremesa" | "bar" | "salao";

export type Base = "cozinha" | "bar";

export type Segmento = "cozinha" | "salao" | "bar" | "delivery";

/** Linha de ficha técnica que aponta para um insumo comprado. */
export interface ItemFichaInsumo {
  tipo: "insumo";
  nome: string;
  quantidade: number;
  unidade: UnidadeFicha;
  /** Preço vigente por unidade base na data do cálculo. */
  precoPorUnidadeBase: number;
  unidadeBase: UnidadeBase;
  /** Rendimento vigente como fração (0,88). */
  rendimento: number;
}

/** Linha de ficha técnica que aponta para uma produção intermediária. */
export interface ItemFichaProducao {
  tipo: "producao";
  nome: string;
  quantidade: number;
  unidade: UnidadeFicha;
  /** Custo da produção por unidade de rendimento (R$/kg, R$/L ou R$/un). */
  custoPorUnidadeBase: number;
  /** Custo que o Altec mostra para a mesma produção (sem rendimento de batelada), quando conhecido. */
  custoAltecPorUnidadeBase?: number;
  unidadeBase: UnidadeBase;
  /** Rendimento de uso da produção dentro do prato (fração). Padrão 1. Ver D-010. */
  rendimentoUso?: number;
}

export type ItemFicha = ItemFichaInsumo | ItemFichaProducao;

export interface CustoItemFicha {
  nome: string;
  tipo: "insumo" | "producao";
  quantidadeBase: number;
  custo: number;
  custoAltec: number;
  /** custo − custoAltec: quanto o rendimento acrescenta nesta linha. */
  distorcao: number;
}

export interface CustoFicha {
  custo: number;
  custoAltec: number;
  itens: CustoItemFicha[];
}

export interface Semaforo {
  /** Quatro tons: preto é o pior, cinza-claro é o melhor (nunca verde e vermelho). */
  nivel: "otimo" | "atencao" | "alerta" | "critico";
}
