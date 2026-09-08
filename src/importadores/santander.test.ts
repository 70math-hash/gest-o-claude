import { describe, expect, it } from "vitest";
import { latin1 } from "./fixtures/planilha";
import { SANTANDER_DEBITO_CREDITO_CSV, SANTANDER_SEM_TIPO_CSV, SANTANDER_TIPO_CSV } from "./fixtures/santander";
import { chaveDescricao, classificarOrigemCredito, lerExtratoSantander } from "./santander";
import { lerTabela } from "./tabela";

describe("lerExtratoSantander com coluna Tipo", () => {
  const extrato = lerExtratoSantander(lerTabela({ nome: "extrato.csv", conteudo: SANTANDER_TIPO_CSV }));

  it("pula os metadados, ignora saldo anterior e rodapé, e lê D/C", () => {
    expect(extrato.colunas).toMatchObject({ data: 0, descricao: 1, documento: 2, valor: 3, tipo: 4, saldo: 5 });
    expect(extrato.lancamentos).toHaveLength(5);
    expect(extrato.linhasLidas).toBe(7);
    expect(extrato.linhasIgnoradas).toBe(2);
    expect(extrato.lancamentos.map((l) => [l.data, l.tipo, l.valor])).toEqual([
      ["2026-04-01", "C", 1250],
      ["2026-04-02", "C", 3480.55],
      ["2026-04-02", "D", 2100],
      ["2026-04-03", "C", 890.1],
      ["2026-04-03", "D", 59.9],
    ]);
    expect(extrato.periodo).toEqual({ inicio: "2026-04-01", fim: "2026-04-03" });
    expect(extrato.totalDebitos).toBe(2159.9);
    expect(extrato.totalCreditos).toBe(5620.65);
    expect(extrato.lancamentos[0]?.saldo).toBe(11250);
    expect(extrato.lancamentos[1]?.documento).toBe("123");
  });

  it("classifica a origem do crédito e gera a chave da descrição", () => {
    expect(extrato.lancamentos.map((l) => l.origemCredito)).toEqual(["pix", "adquirente", "outro", "marketplace", "outro"]);
    expect(extrato.lancamentos[0]?.descricaoChave).toBe("PIX RECEBIDO CLIENTE MESA");
    expect(extrato.lancamentos[1]?.descricaoChave).toBe("REDE CARTAO CREDITO");
    expect(extrato.lancamentos[2]?.descricaoChave).toBe("PAGAMENTO FORNECEDOR LATICINIOS");
  });

  it("lê o mesmo arquivo em CRLF e em Windows-1252", () => {
    const crlf = lerExtratoSantander(lerTabela({ nome: "extrato.csv", conteudo: SANTANDER_TIPO_CSV.replace(/\n/g, "\r\n") }));
    expect(crlf.lancamentos).toHaveLength(5);
    const tabela = lerTabela({ nome: "extrato.csv", conteudo: latin1(SANTANDER_TIPO_CSV) });
    expect(tabela.codificacao).toBe("windows-1252");
    const antigo = lerExtratoSantander(tabela);
    expect(antigo.lancamentos).toHaveLength(5);
    expect(antigo.lancamentos[4]?.descricao).toBe("TARIFA MENSALIDADE PACOTE");
  });
});

describe("lerExtratoSantander sem coluna Tipo", () => {
  it("o sinal do valor decide; vírgula como separador e aspas em tudo", () => {
    const extrato = lerExtratoSantander(lerTabela({ nome: "extrato.csv", conteudo: SANTANDER_SEM_TIPO_CSV }));
    expect(extrato.lancamentos.map((l) => [l.tipo, l.valor, l.origemCredito])).toEqual([
      ["D", 500, "pix"],
      ["C", 1000, "adquirente"],
      ["C", 300.5, "marketplace"],
      ["D", 4000, "outro"],
    ]);
    expect(extrato.lancamentos[3]?.descricaoChave).toBe("ALUGUEL CONDOMINIO E IPTU");
    expect(extrato.lancamentos[0]?.saldo).toBe(9500);
  });
});

describe("lerExtratoSantander com Débito e Crédito separados", () => {
  it("usa a coluna preenchida para decidir o tipo", () => {
    const extrato = lerExtratoSantander(lerTabela({ nome: "extrato.xls.csv", conteudo: SANTANDER_DEBITO_CREDITO_CSV }));
    expect(extrato.lancamentos.map((l) => [l.descricao, l.tipo, l.valor, l.origemCredito])).toEqual([
      ["STONE PAGAMENTOS", "C", 2000, "adquirente"],
      ["ALUGUEL", "D", 5000, "outro"],
      ["GETNET ADQUIRENCIA", "C", 150, "adquirente"],
    ]);
  });

  it("sem cabeçalho devolve vazio com aviso", () => {
    const extrato = lerExtratoSantander([["Extrato"], ["01/04/2026", "10,00"]]);
    expect(extrato.lancamentos).toEqual([]);
    expect(extrato.periodo).toBeNull();
    expect(extrato.avisos[0]).toMatch(/Cabeçalho do extrato não encontrado/);
  });
});

describe("classificarOrigemCredito e chaveDescricao", () => {
  it("palavras-chave por token, sem confundir REDE com REDESCONTO", () => {
    expect(classificarOrigemCredito("REDE CARTAO 0204")).toBe("adquirente");
    expect(classificarOrigemCredito("PAG SEGURO VENDAS")).toBe("adquirente");
    expect(classificarOrigemCredito("SAFRAPAY")).toBe("adquirente");
    expect(classificarOrigemCredito("REDESCONTO BANCARIO")).toBe("outro");
    expect(classificarOrigemCredito("99 FOOD REPASSE")).toBe("marketplace");
    expect(classificarOrigemCredito("KEETA")).toBe("marketplace");
    expect(classificarOrigemCredito("PIX RECEBIDO")).toBe("pix");
    expect(classificarOrigemCredito("TED RECEBIDA")).toBe("outro");
    expect(chaveDescricao("PIX ENVIADO 12/03 FORNECEDOR XYZ CNPJ 12.345.678/0001-90")).toBe("PIX ENVIADO FORNECEDOR XYZ CNPJ");
  });
});
