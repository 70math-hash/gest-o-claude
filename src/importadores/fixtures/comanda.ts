/**
 * Fixture sintética da exportação por comanda (seção 6.2, `atendimentos`).
 * Três comandas: uma com entrada e bebida, uma com sobremesa, uma sem itens.
 */
export const COMANDA_CSV = `Data;Mesa;Comanda;Abertura;Fechamento;Pessoas;Garçom;Categoria;Produto;Qtde;Total
05/04/2026;12;1001;19:30;21:05;2;12 - JOAO;PIZZAS;MARGHERITA;1;62,00
05/04/2026;12;1001;19:30;21:05;2;12 - JOAO;ENTRADAS;STICKS (ENTRADA);1;40,00
05/04/2026;12;1001;19:30;21:05;2;12 - JOAO;VINHOS;VINHO TINTO TAÇA;2;84,00
05/04/2026;7;1002;20:00;21:40;4;15 - MARIA;PIZZAS;RUCOLA;2;150,00
;;;;;;;SOBREMESAS;QTMISU 2.0;1;30,00
05/04/2026;3;1003;20:15;;2;12 - JOAO;;;;
`;

/** Exportação por mesa, sem comanda e sem categoria: agrupa por mesa + abertura; flags ficam sem dado. */
export const MESA_CSV = `Mesa;Chegada;Saída;Pax;Item;Valor
5;19:00;20:30;3;MARGHERITA;62,00
5;19:00;20:30;3;NEGRONI;38,00
5;21:00;22:10;2;RUCOLA;75,00
`;
