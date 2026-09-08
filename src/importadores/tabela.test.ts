import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SINONIMOS_R3 } from "./altec_r3";
import { R3_CSV } from "./fixtures/r3";
import { latin1, xlsxDe } from "./fixtures/planilha";
import { parseNumeroBr } from "./numero_br";
import { decodificarTexto, detectarCabecalho, detectarCabecalhoPorColunas, detectarSeparador, lerCsv, lerTabela, mapearColunas, numeroCanonico } from "./tabela";

describe("lerCsv", () => {
  it("separador ;, aspas com escape, CRLF e BOM", () => {
    const csv = '\ufeffA;B;C\r\n1;"x;y";"diz ""oi"""\r\n2;;3\r\n';
    expect(lerCsv(csv)).toEqual([
      ["A", "B", "C"],
      ["1", "x;y", 'diz "oi"'],
      ["2", "", "3"],
    ]);
  });

  it("separador vírgula com decimais entre aspas, e tabulação", () => {
    expect(lerCsv('"Data","Valor"\n"01/04/2026","-500,00"\n')).toEqual([
      ["Data", "Valor"],
      ["01/04/2026", "-500,00"],
    ]);
    expect(lerCsv("A\tB\n1\t2\n")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });

  it("quebra de linha dentro de aspas e linha final vazia", () => {
    expect(lerCsv('A;B\n"linha\nquebrada";2\n\n\n')).toEqual([
      ["A", "B"],
      ["linha\nquebrada", "2"],
    ]);
  });

  it("detecta ; no R3 apesar das vírgulas decimais e de endereço", () => {
    expect(detectarSeparador(R3_CSV)).toBe(";");
    expect(detectarSeparador("a,b,c\n1,2,3\n")).toBe(",");
  });
});

describe("decodificarTexto", () => {
  it("UTF-8 estrito, com BOM, e fallback para Windows-1252", () => {
    expect(decodificarTexto(new TextEncoder().encode("Pão"))).toEqual({ texto: "Pão", codificacao: "utf-8" });
    expect(decodificarTexto(new Uint8Array([0xef, 0xbb, 0xbf, 0x50, 0xc3, 0xa3, 0x6f]))).toEqual({ texto: "Pão", codificacao: "utf-8" });
    expect(decodificarTexto(latin1("Pão da Casa"))).toEqual({ texto: "Pão da Casa", codificacao: "windows-1252" });
  });
});

describe("lerTabela", () => {
  it("texto vira CSV; bytes Latin-1 são decodificados", () => {
    const t = lerTabela({ nome: "r3.csv", conteudo: "Produto;Qtde\nPÃO DA CASA;4\n" });
    expect(t.formato).toBe("csv");
    expect(t.linhas).toEqual([
      ["Produto", "Qtde"],
      ["PÃO DA CASA", "4"],
    ]);
    const l = lerTabela({ nome: "extrato.txt", conteudo: latin1("Descrição;Valor\nAÇAÍ;12,50\n") });
    expect(l.codificacao).toBe("windows-1252");
    expect(l.linhas[1]).toEqual(["AÇAÍ", "12,50"]);
  });

  it("XLSX pela assinatura: abas na ordem, números canônicos, datas e percentuais preservados", () => {
    const aba1 = XLSX.utils.aoa_to_sheet([
      ["Produto", "Qtde", "Total", "Data", "% Total"],
      ["MARGHERITA", 1702, 1702.5, 46113, 0.1234],
    ]);
    const c = aba1["C2"] as XLSX.CellObject;
    c.z = "#,##0.00";
    const d = aba1["D2"] as XLSX.CellObject;
    d.z = "dd/mm/yyyy";
    const e = aba1["E2"] as XLSX.CellObject;
    e.z = "0.00%";
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, aba1, "Vendas");
    XLSX.utils.book_append_sheet(pasta, XLSX.utils.aoa_to_sheet([["Resumo"], ["ok"]]), "Resumo");
    const bytes: unknown = XLSX.write(pasta, { type: "array", bookType: "xlsx" });
    const conteudo = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : (bytes as Uint8Array);

    const t = lerTabela({ nome: "qualquer.bin", conteudo });
    expect(t.formato).toBe("xlsx");
    expect(t.abas).toEqual([
      { nome: "Vendas", inicio: 0, fim: 2 },
      { nome: "Resumo", inicio: 2, fim: 4 },
    ]);
    expect(t.linhas[0]).toEqual(["Produto", "Qtde", "Total", "Data", "% Total"]);
    expect(t.linhas[1]).toEqual(["MARGHERITA", "1702", "1702,5", "01/04/2026", "12.34%"]);
    expect(parseNumeroBr(t.linhas[1]?.[2])).toBe(1702.5);
    expect(parseNumeroBr(t.linhas[1]?.[4])).toBe(12.34);
    expect(t.linhas[3]).toEqual(["ok"]);
  });

  it("aceita ArrayBuffer e o xlsx gerado pelo helper", () => {
    const t = lerTabela({ nome: "cadastro.xlsx", conteudo: xlsxDe([{ nome: "Insumos", linhas: [["Nome", "Preço"], ["Azeite", 55.5]] }]) });
    expect(t.linhas).toEqual([
      ["Nome", "Preço"],
      ["Azeite", "55,5"],
    ]);
  });

  it("XLS binário (BIFF8) pela assinatura OLE, como o Santander exporta", () => {
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      pasta,
      XLSX.utils.aoa_to_sheet([
        ["Data", "Lançamento", "Valor", "Tipo", "Saldo"],
        ["01/04/2026", "PIX RECEBIDO", 1250, "C", 11250.5],
      ]),
      "Extrato",
    );
    const saida: unknown = XLSX.write(pasta, { type: "array", bookType: "xls" });
    const bytes = saida instanceof ArrayBuffer ? new Uint8Array(saida) : (saida as Uint8Array);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0xd0, 0xcf, 0x11, 0xe0]);
    const t = lerTabela({ nome: "extrato.xls", conteudo: bytes });
    expect(t.formato).toBe("xls");
    expect(t.linhas).toEqual([
      ["Data", "Lançamento", "Valor", "Tipo", "Saldo"],
      ["01/04/2026", "PIX RECEBIDO", "1250", "C", "11250,5"],
    ]);
  });

  it("XLS que na verdade é HTML (exportação de internet banking) passa pelo SheetJS", () => {
    const html = "<html><body><table><tr><td>Data</td><td>Lançamento</td><td>Valor</td></tr><tr><td>01/04/2026</td><td>PIX</td><td>1.250,00</td></tr></table></body></html>";
    const t = lerTabela({ nome: "extrato.xls", conteudo: new TextEncoder().encode(html) });
    expect(t.formato).toBe("html");
    expect(t.linhas[0]).toEqual(["Data", "Lançamento", "Valor"]);
    expect(t.linhas[1]?.[0]).toBe("01/04/2026");
    expect(t.linhas[1]?.[1]).toBe("PIX");
    expect(parseNumeroBr(t.linhas[1]?.[2])).toBe(1250);
  });

  it("numeroCanonico não deixa ruído de ponto flutuante", () => {
    expect(numeroCanonico(0.1 + 0.2)).toBe("0,3");
    expect(numeroCanonico(-1000)).toBe("-1000");
    expect(numeroCanonico(100010)).toBe("100010");
  });
});

describe("detectarCabecalho e mapearColunas", () => {
  const r3 = lerCsv(R3_CSV);

  it("acha a linha do cabeçalho real pulando o institucional", () => {
    expect(detectarCabecalho(r3, "Produto")).toBe(12);
    expect(detectarCabecalho(r3, "Produto", { exigirTambem: ["Qtde", "Total"] })).toBe(12);
    expect(detectarCabecalho(r3, "Inexistente")).toBeNull();
  });

  it("igualdade vence prefixo: 'Produto: Todos' no filtro não engana", () => {
    const linhas = [["Relatório"], ["Produto: Todos"], ["ID", "Produto", "Qtde"]];
    expect(detectarCabecalho(linhas, "Produto")).toBe(2);
    expect(detectarCabecalho([["Produtos vendidos", "Qtde"]], "Produto")).toBe(0);
  });

  it("mapeia as dez colunas do R3 por sinônimo", () => {
    const cabecalho = r3[12] ?? [];
    expect(mapearColunas(cabecalho, SINONIMOS_R3)).toEqual({
      categoria: 0,
      id: 1,
      produto: 2,
      qtde: 3,
      vl_tabela: 4,
      desc_prod: 5,
      desc_global: 6,
      val_bruto: 7,
      total: 8,
      pct_total: 9,
    });
  });

  it("tolera variantes e usa prefixo só para o que sobrou", () => {
    const m = mapearColunas(["Cód", "Descrição", "Quant", "Valor Tabela", "Desc Produto", "Desc Geral", "Valor Bruto", "Vl_Total", "%_Total"], SINONIMOS_R3);
    expect(m).toMatchObject({ id: 0, produto: 1, qtde: 2, vl_tabela: 3, desc_prod: 4, desc_global: 5, val_bruto: 6, total: 7, pct_total: 8 });
    expect(mapearColunas(["Vl Tabela Unit", "Qtde Vendida"], SINONIMOS_R3)).toEqual({ qtde: 1, vl_tabela: 0 });
    // "Total" não rouba a coluna "% Total"
    expect(mapearColunas(["% Total", "Total"], SINONIMOS_R3)).toEqual({ total: 1, pct_total: 0 });
  });

  it("detectarCabecalhoPorColunas exige um nome de cada grupo", () => {
    const linhas = [["Extrato"], ["Data: 01/04/2026"], ["Data", "Lançamento", "Valor"], ["01/04/2026", "PIX", "10,00"]];
    const sin = { data: ["Data"], descricao: ["Lançamento"], valor: ["Valor"] };
    expect(detectarCabecalhoPorColunas(linhas, sin, [["data"], ["descricao"], ["valor"]])).toEqual({ indice: 2, colunas: { data: 0, descricao: 1, valor: 2 } });
    expect(detectarCabecalhoPorColunas(linhas, sin, [["inexistente"]])).toBeNull();
  });
});
