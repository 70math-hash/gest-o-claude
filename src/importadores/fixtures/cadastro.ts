/**
 * Fixtures sintéticas do cadastro inicial (seção 6.4): Insumos, Produções
 * e Fichas, com as inconsistências que o relatório precisa apontar.
 */

/** Cinco insumos: um sem data de preço, um sem preço, um com rendimento 120%. */
export const INSUMOS_CSV = `Nome;Categoria;Unidade compra;Unidade uso;Preço;Rendimento %;Fornecedor;Data do preço
Fior di latte;Laticínios;kg;g;65,00;100;Laticínios X;01/04/2026
Grana padano 12 meses;Laticínios;kg;g;115,25;88;Importadora Y;01/04/2026
Manjericão italiano;Hortifruti;kg;g;299,00;60;Hortifruti Z;
Tomate italiano;Hortifruti;kg;g;;70;Hortifruti Z;01/04/2026
Azeite;Mercearia;l;ml;55,00;120;Importadora Y;01/04/2026
`;

/** Três produções: uma sem rendimento. */
export const PRODUCOES_CSV = `Código;Nome;Rendimento;Unidade do rendimento;Custo por unidade
298;Tortano;2,2;kg;43,30
254;Creme de abobrinha;2,1;kg;9,73
218;Tomate San Marzano;;kg;68,57
`;

/** Duas fichas: Margherita (quatro itens, um deles produção) e Sticks (duas gramagens suspeitas). */
export const FICHAS_CSV = `Produto;ID Altec;Ingrediente ou Produção;Quantidade;Unidade;Rendimento %
Margherita;100011;Fior di latte;120;g;100
;;Grana padano 12 meses;20;g;88
;;Manjericão italiano;3;g;60
;;Tomate San Marzano (produção 218);90;g;88
Sticks;100005;Massa de pizza;2500;g;100
;;Azeite;0,2;ml;88
`;

/** Matrizes das três abas para gerar um XLSX único em memória. */
export const CADASTRO_ABAS: Array<{ nome: string; linhas: Array<Array<string | number>> }> = [
  {
    nome: "Insumos",
    linhas: [
      ["Nome", "Categoria", "Unidade compra", "Unidade uso", "Preço", "Rendimento %", "Fornecedor", "Data do preço"],
      ["Fior di latte", "Laticínios", "kg", "g", 65, 100, "Laticínios X", "01/04/2026"],
      ["Tomate italiano", "Hortifruti", "kg", "g", "", 70, "Hortifruti Z", "01/04/2026"],
    ],
  },
  {
    nome: "Produções",
    linhas: [
      ["Código", "Nome", "Rendimento", "Unidade do rendimento", "Custo por unidade"],
      [298, "Tortano", 2.2, "kg", 43.3],
      [218, "Tomate San Marzano", "", "kg", 68.57],
    ],
  },
  {
    nome: "Fichas",
    linhas: [
      ["Produto", "ID Altec", "Ingrediente ou Produção", "Quantidade", "Unidade", "Rendimento %"],
      ["Margherita", 100011, "Fior di latte", 120, "g", 100],
      ["", "", "Tomate San Marzano (produção 218)", 90, "g", 88],
      ["Sticks", 100005, "Massa de pizza", 2500, "g", 100],
    ],
  },
];
