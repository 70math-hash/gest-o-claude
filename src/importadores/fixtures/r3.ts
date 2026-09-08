/**
 * Fixtures sintéticas do R3 "Vendas por Produto Detalhado" (seção 6.1).
 * Doze linhas de cabeçalho institucional, cabeçalho real com os nomes que
 * o Altec usa, categorias PIZZAS, QUEIJOS BRASILEIROS, ENTRADAS,
 * SOBREMESAS, uma desconhecida, bar e salão, subtotais por categoria e um
 * total geral, números no formato brasileiro e nomes da seção 13.1.
 */

/** Total geral 4.560,00; bruto 4.656,00; 86 unidades; 11 linhas de produto. */
export const R3_CSV = `QT PIZZA BAR;;;;;;;;;
QT PIZZA BAR LTDA - CNPJ 00.000.000/0001-00;;;;;;;;;
Rua Exemplo, 123 - Cerqueira César - São Paulo/SP;;;;;;;;;
;;;;;;;;;
Relatório R3;;;;;;;;;
Vendas por Produto Detalhado;;;;;;;;;
Período: 01/04/2026 a 30/04/2026;;;;;;;;;
Emissão: 01/05/2026 10:32;;;;;;;;;
Filtro: Todos os produtos;;;;;;;;;
Usuário: gestor;;;;;;;;;
Ordenação: categoria, produto;;;;;;;;;
;;;;;;;;;
Categoria;ID;Produto;Qtde;Vl. Tabela;Desc. Prod;Desc. Global;Val. Bruto;Total;% Total
PIZZAS;100011;MARGHERITA;29;62,00;60,00;36,00;1.798,00;1.702,00;37,32
PIZZAS;100012;RUCOLA;12;75,00;0,00;0,00;900,00;900,00;19,74
;;Subtotal PIZZAS;41;;;;2.698,00;2.602,00;57,06
QUEIJOS BRASILEIROS;100262;PIZZA ACIDA;5;70,00;0,00;0,00;350,00;350,00;7,68
QUEIJOS BRASILEIROS;100259;DOCE PAIOLZINHO;3;70,00;0,00;0,00;210,00;210,00;4,61
;;Subtotal QUEIJOS BRASILEIROS;8;;;;560,00;560,00;12,28
ENTRADAS;100005;STICKS (ENTRADA);10;40,00;0,00;0,00;400,00;400,00;8,77
ENTRADAS;;PÃO DA CASA;4;69,00;0,00;0,00;276,00;276,00;6,05
;;Subtotal ENTRADAS;14;;;;676,00;676,00;14,82
SOBREMESAS;120056;QTMISU 2.0;9;30,00;0,00;0,00;270,00;270,00;5,92
SOBREMESAS;120060;"CHOCOLATE, AZEITE E FLOR DE SAL";2;30,00;0,00;0,00;60,00;60,00;1,32
;;Subtotal SOBREMESAS;11;;;;330,00;330,00;7,24
BRINDES E CORTESIAS;900001;BRINDE ANIVERSARIO;2;0,00;0,00;0,00;0,00;0,00;0,00
;;Subtotal BRINDES E CORTESIAS;2;;;;0,00;0,00;0,00
DRINKS CLASSICOS;300010;NEGRONI;7;38,00;0,00;0,00;266,00;266,00;5,83
;;Subtotal DRINKS CLASSICOS;7;;;;266,00;266,00;5,83
VINHOS;400002;VINHO TINTO TAÇA;3;42,00;0,00;0,00;126,00;126,00;2,76
;;Subtotal VINHOS;3;;;;126,00;126,00;2,76
;;Total Geral;86;;;;4.656,00;4.560,00;100,00
`;

/** Variante sem coluna Categoria: a categoria vem como linha de agrupamento e o período no formato "de ... até ...". */
export const R3_AGRUPADO_CSV = `QT PIZZA BAR;;;;;;;;
Vendas por Produto Detalhado;;;;;;;;
Período: de 01/04/2026 até 05/04/2026;;;;;;;;
;;;;;;;;
ID;Produto;Qtde;Vl. Tabela;Desc. Prod;Desc. Global;Val. Bruto;Total;% Total
PIZZAS;;;;;;;;
100011;MARGHERITA;10;62,00;0,00;0,00;620,00;620,00;77,50
100015;BURRATA PIZZA;1;130,00;0,00;0,00;130,00;130,00;16,25
;Subtotal;11;;;;750,00;750,00;93,75
ENTRADAS;;;;;;;;
100004;BURRATA (ENTRADA);1;90,00;40,00;0,00;90,00;50,00;6,25
;Subtotal;1;;;;90,00;50,00;6,25
;Total;12;;;;840,00;800,00;100,00
`;

/** Matriz equivalente ao R3_CSV para gerar XLSX em memória: números como número, como o Altec exporta. */
export const R3_MATRIZ: Array<Array<string | number>> = [
  ["QT PIZZA BAR"],
  ["QT PIZZA BAR LTDA - CNPJ 00.000.000/0001-00"],
  ["Rua Exemplo, 123 - Cerqueira César - São Paulo/SP"],
  [],
  ["Relatório R3"],
  ["Vendas por Produto Detalhado"],
  ["Período: 01/04/2026 a 30/04/2026"],
  ["Emissão: 01/05/2026 10:32"],
  ["Filtro: Todos os produtos"],
  ["Usuário: gestor"],
  ["Ordenação: categoria, produto"],
  [],
  ["Categoria", "ID", "Produto", "Qtde", "Vl. Tabela", "Desc. Prod", "Desc. Global", "Val. Bruto", "Total", "% Total"],
  ["PIZZAS", 100011, "MARGHERITA", 29, 62, 60, 36, 1798, 1702, 37.32],
  ["PIZZAS", 100012, "RUCOLA", 12, 75, 0, 0, 900, 900, 19.74],
  ["", "", "Subtotal PIZZAS", 41, "", "", "", 2698, 2602, 57.06],
  ["QUEIJOS BRASILEIROS", 100262, "PIZZA ACIDA", 5, 70, 0, 0, 350, 350, 7.68],
  ["QUEIJOS BRASILEIROS", 100259, "DOCE PAIOLZINHO", 3, 70, 0, 0, 210, 210, 4.61],
  ["", "", "Subtotal QUEIJOS BRASILEIROS", 8, "", "", "", 560, 560, 12.28],
  ["ENTRADAS", 100005, "STICKS (ENTRADA)", 10, 40, 0, 0, 400, 400, 8.77],
  ["ENTRADAS", "", "PÃO DA CASA", 4, 69, 0, 0, 276, 276, 6.05],
  ["", "", "Subtotal ENTRADAS", 14, "", "", "", 676, 676, 14.82],
  ["SOBREMESAS", 120056, "QTMISU 2.0", 9, 30, 0, 0, 270, 270, 5.92],
  ["SOBREMESAS", 120060, "CHOCOLATE, AZEITE E FLOR DE SAL", 2, 30, 0, 0, 60, 60, 1.32],
  ["", "", "Subtotal SOBREMESAS", 11, "", "", "", 330, 330, 7.24],
  ["BRINDES E CORTESIAS", 900001, "BRINDE ANIVERSARIO", 2, 0, 0, 0, 0, 0, 0],
  ["", "", "Subtotal BRINDES E CORTESIAS", 2, "", "", "", 0, 0, 0],
  ["DRINKS CLASSICOS", 300010, "NEGRONI", 7, 38, 0, 0, 266, 266, 5.83],
  ["", "", "Subtotal DRINKS CLASSICOS", 7, "", "", "", 266, 266, 5.83],
  ["VINHOS", 400002, "VINHO TINTO TAÇA", 3, 42, 0, 0, 126, 126, 2.76],
  ["", "", "Subtotal VINHOS", 3, "", "", "", 126, 126, 2.76],
  ["", "", "Total Geral", 86, "", "", "", 4656, 4560, 100],
];
