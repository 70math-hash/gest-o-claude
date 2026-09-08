/**
 * Fixtures sintéticas da exportação diária por segmento e colaborador
 * (seção 6.2). O formato real ainda não foi recebido: estas fixtures
 * exercitam a detecção por sinônimos, o grupo em coluna e em linha de
 * agrupamento, o colaborador "código - nome" e a taxa de serviço explícita.
 */

/** Cozinha 760; salão 126; bar 190; delivery 186; vendas 1.262; 14 pratos; 3 colaboradores. */
export const DIA_CSV = `Vendas do dia
Data: 05/04/2026

Grupo;Produto;Qtde;Venda Bruta;Venda Líquida;Garçom
JANTAR;MARGHERITA;10;620,00;600,00;12 - JOAO
JANTAR;STICKS (ENTRADA);4;160,00;160,00;12 - JOAO
SALAO;VINHO TINTO TAÇA;3;126,00;126,00;15 - MARIA
BAR;NEGRONI;5;190,00;190,00;21 - PEDRO
DELIVERY;MARGHERITA;3;186,00;186,00;
TOTAL;;25;1.282,00;1.262,00;
`;

/** Grupo em linha de agrupamento, taxa de serviço como item, coluna de data, grupo desconhecido, código e nome separados. */
export const DIA_AGRUPADO_CSV = `Data;Cód. Garçom;Garçom;Produto;Quantidade;Total
PIZZAS;;;;;
05/04/2026;12;JOAO;MARGHERITA;2;124,00
05/04/2026;15;MARIA;RUCOLA;1;75,00
BEBIDAS NAO ALCOOLICAS;;;;;
05/04/2026;12;JOAO;AGUA SEM GAS;2;16,00
OUTROS;;;;;
05/04/2026;12;JOAO;ESTACIONAMENTO;1;20,00
;;;TAXA DE SERVIÇO;1;30,55
;;;Total Geral;;265,55
`;
