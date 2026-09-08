/**
 * Fixtures dos testes de aceite (seção 11). Fichas reais da casa, abril de
 * 2026, conforme o cadastro corrigido no Altec. Também alimentam a semente
 * SQL (supabase/seed) para que o banco e o motor partam dos mesmos dados.
 */
import type { ItemFicha } from "./tipos";

type LinhaInsumo = { nome: string; quantidade: number; unidade: "g" | "kg" | "ml" | "l" | "un"; preco: number; unidadeBase: "kg" | "l" | "un"; rendimento: number };
type LinhaProducao = { nome: string; codigo: string; quantidade: number; unidade: "g" | "kg" | "ml" | "l" | "un"; custo: number; custoAltec?: number; unidadeBase: "kg" | "l" | "un"; rendimentoUso: number };

export function insumo(l: LinhaInsumo): ItemFicha {
  return { tipo: "insumo", nome: l.nome, quantidade: l.quantidade, unidade: l.unidade, precoPorUnidadeBase: l.preco, unidadeBase: l.unidadeBase, rendimento: l.rendimento };
}

export function producao(l: LinhaProducao): ItemFicha {
  return { tipo: "producao", nome: `${l.nome} (produção ${l.codigo})`, quantidade: l.quantidade, unidade: l.unidade, custoPorUnidadeBase: l.custo, custoAltecPorUnidadeBase: l.custoAltec, unidadeBase: l.unidadeBase, rendimentoUso: l.rendimentoUso };
}

/** Produções intermediárias com custo por unidade de rendimento e rendimento de uso no prato. */
export const PRODUCOES = {
  tomateSanMarzano: { nome: "Tomate San Marzano", codigo: "218", custo: 68.57, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  massaDePizza: { nome: "Massa de pizza", codigo: "219", custo: 1.88, unidadeBase: "un" as const, rendimentoUso: 1 },
  gremolata: { nome: "Gremolata", codigo: "221", custo: 16.6, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  caponata: { nome: "Caponata", codigo: "248", custo: 22.31, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  raguDeLinguica: { nome: "Ragu de linguiça", codigo: "252", custo: 73.75, unidadeBase: "kg" as const, rendimentoUso: 1 },
  aioli: { nome: "Aioli", codigo: "253", custo: 5.29, unidadeBase: "kg" as const, rendimentoUso: 0.92 },
  fondue: { nome: "Fondue", codigo: "256", custo: 53.6, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  arancini: { nome: "Arancini", codigo: "268", custo: 36.52, unidadeBase: "kg" as const, rendimentoUso: 1 },
  maioneseDeAgriao: { nome: "Maionese de agrião", codigo: "269", custo: 4.37, unidadeBase: "kg" as const, rendimentoUso: 1 },
  focaccia: { nome: "Focaccia", codigo: "272", custo: 16.82, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  pestoDeManjericao: { nome: "Pesto de manjericão", codigo: "273", custo: 10.73, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  mixDeCogumelos: { nome: "Mix de cogumelos", codigo: "138", custo: 56.78, unidadeBase: "kg" as const, rendimentoUso: 0.88 },
  /** O Altec mostrava R$ 108,79/kg antes de cadastrar o rendimento da batelada (11.2). */
  tortano: { nome: "Tortano", codigo: "298", custo: 43.3, custoAltec: 108.79, unidadeBase: "kg" as const, rendimentoUso: 1 },
  molhoDeQueijo: { nome: "Molho de queijo", codigo: "299", custo: 9.95, unidadeBase: "kg" as const, rendimentoUso: 1 },
};

const P = PRODUCOES;
const usa = (p: (typeof PRODUCOES)[keyof typeof PRODUCOES], quantidade: number, unidade: "g" | "kg" | "ml" | "l" | "un") => producao({ ...p, quantidade, unidade });

/** Fichas técnicas reais (abril de 2026). Preço de venda ao lado. */
export const FICHAS = {
  pomodori: {
    nome: "Pomodori",
    preco: 75,
    itens: [
      insumo({ nome: "Tomate assado", quantidade: 90, unidade: "g", preco: 9.9, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Tomate San Marzano La Solania", quantidade: 90, unidade: "g", preco: 68.68, unidadeBase: "kg", rendimento: 1 }),
      usa(P.massaDePizza, 1, "un"),
      insumo({ nome: "Tomate ressecado", quantidade: 20, unidade: "g", preco: 99, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Aioli de tomate seco", quantidade: 10, unidade: "g", preco: 15.89, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Tomate ciliegini amarelo", quantidade: 50, unidade: "g", preco: 93.6, unidadeBase: "kg", rendimento: 1 }),
    ],
  },
  saladaCaprese: {
    nome: "Salada Caprese",
    preco: 45,
    itens: [
      insumo({ nome: "Mozzarella de búfala", quantidade: 120, unidade: "g", preco: 65.09, unidadeBase: "kg", rendimento: 0.92 }),
      insumo({ nome: "Tomate", quantidade: 85, unidade: "g", preco: 7.9, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Manjericão italiano", quantidade: 10, unidade: "g", preco: 299, unidadeBase: "kg", rendimento: 0.6 }),
      usa(P.pestoDeManjericao, 40, "g"),
    ],
  },
  arancini: {
    nome: "Arancini",
    preco: 69,
    itens: [usa(P.arancini, 180, "g"), usa(P.maioneseDeAgriao, 20, "g")],
  },
  carpaccio: {
    nome: "Carpaccio",
    preco: 59,
    itens: [
      insumo({ nome: "Azeite", quantidade: 20, unidade: "ml", preco: 55, unidadeBase: "l", rendimento: 0.88 }),
      insumo({ nome: "Grana padano 12 meses", quantidade: 20, unidade: "g", preco: 115.25, unidadeBase: "kg", rendimento: 0.88 }),
      insumo({ nome: "Filet mignon", quantidade: 100, unidade: "g", preco: 86.5, unidadeBase: "kg", rendimento: 1 }),
      usa(P.aioli, 30, "g"),
      usa(P.focaccia, 100, "g"),
      usa(P.pestoDeManjericao, 30, "g"),
    ],
  },
  burrataEntrada: {
    nome: "Burrata",
    preco: 90,
    itens: [
      insumo({ nome: "Burrata", quantidade: 1, unidade: "un", preco: 19.9, unidadeBase: "un", rendimento: 1 }),
      insumo({ nome: "Presunto cru", quantidade: 15, unidade: "g", preco: 178.37, unidadeBase: "kg", rendimento: 1 }),
      usa(P.mixDeCogumelos, 50, "g"),
      usa(P.gremolata, 15, "g"),
      usa(P.focaccia, 100, "g"),
    ],
  },
  sticks: {
    nome: "Sticks",
    preco: 40,
    itens: [
      insumo({ nome: "Azeite", quantidade: 11, unidade: "ml", preco: 55, unidadeBase: "l", rendimento: 0.88 }),
      insumo({ nome: "Pimenta calabresa", quantidade: 30, unidade: "g", preco: 9.15, unidadeBase: "kg", rendimento: 1 }),
      usa(P.tomateSanMarzano, 60, "g"),
      usa(P.massaDePizza, 0.25, "un"),
      usa(P.gremolata, 6, "g"),
      usa(P.aioli, 30, "g"),
    ],
  },
  paoDaCasa: {
    nome: "Pão da Casa",
    preco: 69,
    itens: [
      insumo({ nome: "Grana padano 12 meses", quantidade: 20, unidade: "g", preco: 115.25, unidadeBase: "kg", rendimento: 0.88 }),
      usa(P.massaDePizza, 0.25, "un"),
      usa(P.gremolata, 6, "g"),
      usa(P.fondue, 200, "g"),
    ],
  },
  tabuaDeBruschetta: {
    nome: "Tábua de Bruschetta",
    preco: 59,
    itens: [
      insumo({ nome: "Tomate italiano", quantidade: 12, unidade: "g", preco: 9.9, unidadeBase: "kg", rendimento: 0.7 }),
      insumo({ nome: "Barriga de porco", quantidade: 6, unidade: "g", preco: 228, unidadeBase: "kg", rendimento: 0.88 }),
      usa(P.caponata, 42, "g"),
      usa(P.raguDeLinguica, 16, "g"),
      usa(P.aioli, 16, "g"),
      usa(P.fondue, 30, "g"),
      usa(P.pestoDeManjericao, 8, "g"),
      insumo({ nome: "Picles de maçã verde", quantidade: 8, unidade: "g", preco: 0, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Pão italiano", quantidade: 120, unidade: "g", preco: 13.36, unidadeBase: "kg", rendimento: 1 }),
    ],
  },
  frittoDiBufala: {
    nome: "Fritto di Bufala",
    preco: 65,
    itens: [
      insumo({ nome: "Mozzarella de búfala em barra", quantidade: 250, unidade: "g", preco: 62.65, unidadeBase: "kg", rendimento: 1 }),
      insumo({ nome: "Farinha Superiore", quantidade: 70, unidade: "g", preco: 12.75, unidadeBase: "kg", rendimento: 0.88 }),
      insumo({ nome: "Farinha panko", quantidade: 70, unidade: "g", preco: 17.9, unidadeBase: "kg", rendimento: 0.88 }),
      usa(P.tomateSanMarzano, 80, "g"),
      insumo({ nome: "Água", quantidade: 70, unidade: "ml", preco: 0.03, unidadeBase: "l", rendimento: 0.95 }),
    ],
  },
  paoDeCalabresa: {
    nome: "Pão de Calabresa",
    preco: 65,
    itens: [usa(P.tortano, 350, "g"), usa(P.molhoDeQueijo, 100, "g")],
  },
} as const;

/** Vendas de entradas no primeiro trimestre de 2026 (seção 11.8): 422 unidades em 9 itens. */
export const VENDAS_ENTRADAS_T1_2026: Array<{ chave: keyof typeof FICHAS; qtde: number }> = [
  { chave: "sticks", qtde: 113 },
  { chave: "arancini", qtde: 59 },
  { chave: "carpaccio", qtde: 54 },
  { chave: "frittoDiBufala", qtde: 54 },
  { chave: "tabuaDeBruschetta", qtde: 40 },
  { chave: "burrataEntrada", qtde: 37 },
  { chave: "paoDaCasa", qtde: 37 },
  { chave: "paoDeCalabresa", qtde: 17 },
  { chave: "saladaCaprese", qtde: 11 },
];

/** Canais com os parâmetros de partida de 2026 (seção 5.9). */
export const CANAIS_2026 = [
  { nome: "Salão", comissao: 0, taxaPagamento: 0.032, embalagem: 0, entrega: 0, entregaPor: "nenhuma" as const },
  { nome: "Canal próprio, casa entrega", comissao: 0, taxaPagamento: 0.032, embalagem: 3, entrega: 9, entregaPor: "casa" as const },
  { nome: "Marketplace básico, casa entrega", comissao: 0.12, taxaPagamento: 0.032, embalagem: 3, entrega: 9, entregaPor: "casa" as const },
  { nome: "Marketplace entrega da plataforma", comissao: 0.23, taxaPagamento: 0.032, embalagem: 3, entrega: 0, entregaPor: "plataforma" as const },
  { nome: "Marketplace 27% mais 3,5%", comissao: 0.27, taxaPagamento: 0.035, embalagem: 3, entrega: 0, entregaPor: "plataforma" as const },
];
