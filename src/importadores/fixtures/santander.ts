/**
 * Fixtures sintéticas do extrato Santander (seção 6.3): com coluna Tipo
 * (D/C) e metadados no topo, sem Tipo (sinal decide, separador vírgula com
 * aspas) e com Débito e Crédito em colunas separadas.
 */

/** Débitos 2.159,90; créditos 5.620,65; um "SALDO ANTERIOR" sem valor e um rodapé sem data. */
export const SANTANDER_TIPO_CSV = `Extrato Conta Corrente
Agência: 0001  Conta: 12345-6
Cliente: QT PIZZA BAR LTDA
Período: 01/04/2026 a 05/04/2026

Data;Lançamento;Documento;Valor;Tipo;Saldo
01/04/2026;SALDO ANTERIOR;;;;10.000,00
01/04/2026;PIX RECEBIDO 12345 CLIENTE MESA 12;;1.250,00;C;11.250,00
02/04/2026;REDE CARTAO CREDITO 0204;123;3.480,55;C;14.730,55
02/04/2026;PAGAMENTO FORNECEDOR LATICINIOS 998;456;2.100,00;D;12.630,55
03/04/2026;IFOOD REPASSE 0303;;890,10;C;13.520,65
03/04/2026;TARIFA MENSALIDADE PACOTE;;59,90;D;13.460,75
;TOTAL DO PERÍODO;;;;
`;

/** Sem coluna Tipo: valor negativo é débito. Separador vírgula, todos os campos entre aspas. */
export const SANTANDER_SEM_TIPO_CSV = `"Data","Descrição","Valor","Saldo"
"01/04/2026","PIX ENVIADO FORNECEDOR HORTIFRUTI","-500,00","9.500,00"
"01/04/2026","CIELO VENDAS 0104","1.000,00","10.500,00"
"02/04/2026","RAPPI REPASSE","300,50","10.800,50"
"02/04/2026","ALUGUEL, CONDOMINIO E IPTU","-4.000,00","6.800,50"
`;

/** Débito e Crédito em colunas separadas. */
export const SANTANDER_DEBITO_CREDITO_CSV = `Data;Histórico;Débito;Crédito;Saldo
01/04/2026;STONE PAGAMENTOS;;2.000,00;12.000,00
02/04/2026;ALUGUEL;5.000,00;;7.000,00
03/04/2026;GETNET ADQUIRENCIA;;150,00;7.150,00
`;
