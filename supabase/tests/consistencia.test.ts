/**
 * Teste de consistência: as views e funções SQL têm de dar o mesmo número que
 * o motor TypeScript (seção 3, "as views SQL espelham esses módulos").
 * Roda contra o Postgres local (DATABASE_URL), recriado com scripts/db_local.sh.
 */
import { execSync } from "node:child_process";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { custoFicha, cmvPonderado, classificar, margemContribuicaoItem, tabelaCanais, dreVertical, pontoEquilibrio, aliquotaEfetivaSimples, arredondar } from "@/motor";
import { FICHAS, VENDAS_ENTRADAS_T1_2026 } from "@/motor/fixtures_secao11";

const URL = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5433/qt_gestao_teste";
const UNIDADE = "00000000-0000-0000-0000-000000000001";
let db: Client;

const NOMES: Record<keyof typeof FICHAS, string> = {
  pomodori: "Pomodori", saladaCaprese: "Salada Caprese", arancini: "Arancini", carpaccio: "Carpaccio", burrataEntrada: "Burrata (entrada)",
  sticks: "Sticks", paoDaCasa: "Pão da Casa", tabuaDeBruschetta: "Tábua de Bruschetta", frittoDiBufala: "Fritto di Bufala", paoDeCalabresa: "Pão de Calabresa",
};

async function um<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query(sql, params);
  return r.rows[0] as T;
}
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
function perto(a: number | null, b: number | null, tol = 0.005) {
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(Math.abs((a as number) - (b as number))).toBeLessThanOrEqual(tol);
}

beforeAll(async () => {
  execSync("bash scripts/db_local.sh qt_gestao_teste", { stdio: "pipe", cwd: process.cwd() });
  db = new Client({ connectionString: URL });
  await db.connect();
});
afterAll(async () => {
  await db?.end();
});

describe("custo de ficha: SQL = motor", () => {
  it.each(Object.keys(FICHAS) as Array<keyof typeof FICHAS>)("%s", async (chave) => {
    const esperado = custoFicha(FICHAS[chave].itens as never);
    const linha = await um<{ custo: string; custo_altec: string; origem: string }>(
      "select c.custo, c.custo_altec, c.origem from produtos p cross join lateral f_custo_produto(p.id, '2026-04-15') c where p.unidade_id = $1 and p.nome = $2",
      [UNIDADE, NOMES[chave]],
    );
    expect(linha.origem).toBe("ficha");
    perto(n(linha.custo), esperado.custo);
    perto(n(linha.custo_altec), esperado.custoAltec);
  });
});

describe("Simples Nacional: SQL = motor", () => {
  it.each([100_000, 300_000, 700_000, 1_800_000, 3_000_000, 4_800_000])("RBT12 %s", async (rbt12) => {
    const linha = await um<{ a: string }>("select f_aliquota_simples($1) as a", [rbt12]);
    perto(n(linha.a), aliquotaEfetivaSimples(rbt12), 1e-6);
  });
});

describe("vendas do trimestre (11.8): CMV ponderado e engenharia", () => {
  beforeAll(async () => {
    await db.query("insert into importacoes (id, unidade_id, tipo, arquivo, hash, periodo_inicio, periodo_fim, status) values ('10000000-0000-0000-0000-000000000001', $1, 'altec_r3', 'r3_t1_2026.csv', 'hash-teste-t1', '2026-01-01', '2026-03-31', 'concluida')", [UNIDADE]);
    for (const v of VENDAS_ENTRADAS_T1_2026) {
      const preco = FICHAS[v.chave].preco;
      await db.query(
        `insert into vendas_itens (unidade_id, importacao_id, data, produto_id, categoria_altec, qtde, vl_tabela, val_bruto, total)
         select $1, '10000000-0000-0000-0000-000000000001', '2026-03-31', id, 'ENTRADAS', $3::numeric, $4::numeric, $3::numeric * $4::numeric, $3::numeric * $4::numeric * 0.95 from produtos where unidade_id = $1 and nome = $2`,
        [UNIDADE, NOMES[v.chave], v.qtde, preco],
      );
    }
  });

  it("cmv ponderado do bloco de entradas bate com o motor (tabela e operacional)", async () => {
    const vendas = VENDAS_ENTRADAS_T1_2026.map((v) => ({ custoFicha: custoFicha(FICHAS[v.chave].itens as never).custo, qtde: v.qtde, total: FICHAS[v.chave].preco * v.qtde * 0.95, valBruto: FICHAS[v.chave].preco * v.qtde }));
    const esperado = cmvPonderado(vendas);
    const linha = await um<{ cmv_operacional: string; cmv_tabela: string; qtde: string }>("select cmv_operacional, cmv_tabela, qtde from v_cmv_ponderado_bloco($1, '2026-01-01', '2026-03-31') where bloco = 'entrada'", [UNIDADE]);
    expect(n(linha.qtde)).toBe(422);
    perto(n(linha.cmv_operacional), esperado.cmvOperacional, 0.001);
    perto(n(linha.cmv_tabela), esperado.cmvTabela, 0.001);
    perto(n(linha.cmv_tabela), 0.222, 0.001);
  });

  it("matriz de Miller: mesmos quadrantes do motor", async () => {
    const itens = VENDAS_ENTRADAS_T1_2026.map((v) => {
      const custo = custoFicha(FICHAS[v.chave].itens as never).custo;
      return { id: NOMES[v.chave], nome: NOMES[v.chave], qtde: v.qtde, precoVenda: FICHAS[v.chave].preco * 0.95, custoFicha: custo, margemContribuicao: 0 };
    });
    const esperado = classificar(itens, "miller", 0.7);
    const r = await db.query("select nome, quadrante, piso_popularidade_unidades, cmv_ponderado from v_engenharia_cardapio($1, '2026-01-01', '2026-03-31', 'entrada', 'miller')", [UNIDADE]);
    expect(r.rows).toHaveLength(9);
    for (const row of r.rows) {
      const item = esperado.itens.find((i) => i.nome === row.nome)!;
      expect(row.quadrante).toBe(item.quadrante);
    }
    perto(n(r.rows[0].piso_popularidade_unidades), esperado.pisoPopularidadeUnidades, 0.01);
    perto(n(r.rows[0].cmv_ponderado), esperado.cmvPonderado, 0.001);
  });

  it("Kasavana-Smith sem imposto cadastrado devolve falta em vez de número inventado", async () => {
    const r = await db.query("select quadrante, falta from v_engenharia_cardapio($1, '2026-01-01', '2026-03-31', 'entrada', 'kasavana_smith')", [UNIDADE]);
    expect(r.rows.every((x) => x.quadrante === null && typeof x.falta === "string")).toBe(true);
  });
});

describe("canais (11.7): SQL = motor", () => {
  it("margens por canal para a Pomodori com os parâmetros semeados", async () => {
    const r = await db.query("select canal, margem, indice, preco_equivalencia, falta from v_margem_canal($1, (select id from produtos where unidade_id = $1 and nome = 'Pomodori'), '2026-04-15')", [UNIDADE]);
    const canais = [
      { nome: "Salão", comissao: 0, taxaPagamento: 0.032, embalagem: 0, entrega: 0, entregaPor: "nenhuma" as const },
      { nome: "Delivery próprio (casa entrega)", comissao: 0, taxaPagamento: 0.032, embalagem: 3, entrega: 9, entregaPor: "casa" as const },
      { nome: "iFood Básico (casa entrega)", comissao: 0.12, taxaPagamento: 0.032, embalagem: 3, entrega: 9, entregaPor: "casa" as const },
      { nome: "iFood Entrega (plataforma entrega)", comissao: 0.23, taxaPagamento: 0.032, embalagem: 3, entrega: 0, entregaPor: "plataforma" as const },
      { nome: "Rappi (plataforma entrega)", comissao: 0.27, taxaPagamento: 0.035, embalagem: 3, entrega: 0, entregaPor: "plataforma" as const },
    ];
    const esperado = tabelaCanais(75, 15.77, canais);
    for (const e of esperado) {
      const row = r.rows.find((x) => x.canal === e.nome)!;
      perto(n(row.margem), e.margem);
      perto(n(row.indice), e.indice, 0.001);
    }
    const semDado = r.rows.filter((x) => x.canal === "99Food" || x.canal === "Keeta");
    expect(semDado.every((x) => x.margem === null && x.falta)).toBe(true);
    perto(n(r.rows.find((x) => x.canal === "iFood Entrega (plataforma entrega)").preco_equivalencia), 102.44, 0.01);
  });
});

describe("mês fechado sintético (maio de 2026): DRE, ponto de equilíbrio, gap", () => {
  // Maio de 2026 tem 27 dias de operação (fechado nas segundas 4, 11, 18 e 25).
  const dias = 27;
  beforeAll(async () => {
    await db.query("update parametros set imposto_pct = 0.09, taxa_pagamento_pct = 0.035, cadeiras = 60, mesas = 20 where unidade_id = $1", [UNIDADE]);
    // Vendas: 26 dias de R$ 15.000 (R$ 390.000 no mês), 80 clientes por dia.
    for (let d = 1; d <= 31; d++) {
      const data = `2026-05-${String(d).padStart(2, "0")}`;
      const dow = new Date(`${data}T12:00:00Z`).getUTCDay();
      if (dow === 1) continue;
      await db.query("insert into vendas_dia (unidade_id, data, faturamento_bruto, taxa_servico, clientes, comandas, por_segmento) values ($1, $2, 15000, 1950, 80, 40, '{\"cozinha\": 10000, \"salao\": 3000, \"bar\": 1500, \"delivery\": 500}')", [UNIDADE, data]);
    }
    // Inventários gerais fechados em 30/04 e 31/05, cozinha e bar.
    for (const [data, qtdFior, qtdGrana] of [["2026-04-30", 100, 20], ["2026-05-31", 60, 10]] as const) {
      for (const base of ["cozinha", "bar"] as const) {
        const inv = await um<{ id: string }>("insert into inventarios (unidade_id, data, tipo, base, fechado) values ($1, $2, 'geral', $3, true) returning id", [UNIDADE, data, base]);
        if (base === "cozinha") {
          await db.query("insert into inventario_itens (unidade_id, inventario_id, insumo_id, quantidade_contada) select $1, $2, id, $3 from insumos where unidade_id = $1 and nome = 'Fior di latte'", [UNIDADE, inv.id, qtdFior]);
          await db.query("insert into inventario_itens (unidade_id, inventario_id, insumo_id, quantidade_contada) select $1, $2, id, $3 from insumos where unidade_id = $1 and nome = 'Grana padano 12 meses'", [UNIDADE, inv.id, qtdGrana]);
        }
      }
    }
    // Compras de maio: 1.000 kg de fior a R$ 65 (R$ 65.000) + 300 kg de grana a R$ 115,25 (R$ 34.575).
    const compra = await um<{ id: string }>("insert into compras (unidade_id, data, nota_numero, total) values ($1, '2026-05-10', 'NF 123', 99575) returning id", [UNIDADE]);
    await db.query("insert into compra_itens (unidade_id, compra_id, insumo_id, quantidade, preco_unitario) select $1, $2, id, 1000, 65 from insumos where unidade_id = $1 and nome = 'Fior di latte'", [UNIDADE, compra.id]);
    await db.query("insert into compra_itens (unidade_id, compra_id, insumo_id, quantidade, preco_unitario) select $1, $2, id, 300, 115.25 from insumos where unidade_id = $1 and nome = 'Grana padano 12 meses'", [UNIDADE, compra.id]);
    // Folha e despesas do mês.
    await db.query("insert into colaboradores (unidade_id, nome, cargo, admissao) values ($1, 'Equipe (teste)', 'cozinheiro', '2025-01-01')", [UNIDADE]);
    await db.query("insert into folha_mensal (unidade_id, competencia, colaborador_id, salario, encargos, beneficios, horas_extras_valor) select $1, '2026-05-01', id, 80000, 24000, 5200, 0 from colaboradores where unidade_id = $1", [UNIDADE]);
    const despesas: Array<[string, number]> = [["Aluguel", 30000], ["Condomínio e IPTU", 5100], ["Energia elétrica", 9000], ["Gás", 4000], ["Água", 2600], ["Manutenção e reparos", 12000], ["Limpeza e descartáveis", 9000], ["Sistemas e software", 6300], ["Mídia e impulsionamento", 11700], ["Embalagem de delivery", 2000], ["Pró-labore", 20000]];
    for (const [conta, valor] of despesas) {
      await db.query("insert into despesas (unidade_id, competencia, data_caixa, conta_id, valor, descricao, confirmada) select $1, '2026-05-01', '2026-05-15', id, $3, $2, true from plano_contas where unidade_id = $1 and nome = $2", [UNIDADE, conta, valor]);
    }
  });

  it("CMV real da cozinha = estoque inicial + compras − estoque final", async () => {
    const r = await um<{ estoque_inicial: string; compras: string; estoque_final: string; cmv_real_reais: string; receita: string; cmv_real_pct: string }>("select * from v_cmv_real_base($1, '2026-05-01', '2026-05-31', 'cozinha')", [UNIDADE]);
    const ei = 100 * 65 + 20 * 115.25;
    const ef = 60 * 65 + 10 * 115.25;
    perto(n(r.estoque_inicial), ei);
    perto(n(r.compras), 99575);
    perto(n(r.estoque_final), ef);
    perto(n(r.cmv_real_reais), ei + 99575 - ef);
    perto(n(r.receita), dias * 10500);
    perto(n(r.cmv_real_pct), (ei + 99575 - ef) / (dias * 10500), 0.0001);
  });

  it("DRE vertical e ponto de equilíbrio batem com o motor", async () => {
    const receita = dias * 15000;
    const cmvReal = 100 * 65 + 20 * 115.25 + 99575 - (60 * 65 + 10 * 115.25);
    const esperado = dreVertical({
      receitaBruta: receita, impostos: receita * 0.09, taxasPagamento: receita * 0.035, comissoesMarketplace: 0, cmv: cmvReal, embalagem: 2000,
      folhaComEncargos: 80000 + 24000 + 5200,
      outrosFixos: [{ nome: "Ocupação", valor: 35100 }, { nome: "Utilidades", valor: 15600 }, { nome: "Operacional", valor: 27300 }, { nome: "Marketing", valor: 11700 }],
    });
    const r = await db.query("select codigo, valor, vertical, origem, falta from v_dre_vertical($1, '2026-05-01')", [UNIDADE]);
    const linha = (c: string) => r.rows.find((x) => x.codigo === c);
    perto(n(linha("receita_bruta").valor), receita);
    perto(n(linha("receita_liquida").valor), esperado.receitaLiquida);
    perto(n(linha("cmv").valor), -cmvReal);
    expect(linha("cmv").origem).toBe("real por estoque");
    perto(n(linha("margem_contribuicao").valor), esperado.margemContribuicao);
    perto(n(linha("custos_fixos").valor), -esperado.custosFixos);
    perto(n(linha("resultado_operacional").valor), esperado.resultadoOperacional);
    perto(n(linha("resultado_operacional").vertical), esperado.resultadoPct, 0.0001);
    perto(n(linha("resultado_final").valor), esperado.resultadoOperacional - 20000);

    const pc = await um<{ prime_cost_pct: string }>("select prime_cost_pct from v_prime_cost($1, '2026-05-01')", [UNIDADE]);
    perto(n(pc.prime_cost_pct), esperado.primeCostPct, 0.0001);

    const pe = await um<Record<string, string>>("select * from v_ponto_equilibrio($1, '2026-05-01')", [UNIDADE]);
    const custosVariaveis = receita * 0.09 + receita * 0.035 + cmvReal + 2000;
    const esperadoPe = pontoEquilibrio({ receita, custosVariaveis, custosFixos: esperado.custosFixos, ticketMedio: receita / (dias * 80), diasAbertos: dias });
    perto(n(pe.margem_contribuicao), esperadoPe.margemContribuicao);
    perto(n(pe.ponto_equilibrio_reais), esperadoPe.reais, 0.01);
    perto(n(pe.ponto_equilibrio_clientes), esperadoPe.clientes, 0.01);
    perto(n(pe.ponto_equilibrio_por_dia), esperadoPe.porDia, 0.01);
    perto(n(pe.margem_seguranca), esperadoPe.margemSeguranca, 0.0001);
    expect(Number(pe.dias_abertos)).toBe(dias);
    expect(pe.dia_de_virada).not.toBeNull();
  });

  it("gap de controle usa a mesma base: cozinha com cozinha", async () => {
    const r = await db.query("select base, cmv_real_pct, cmv_teorico_pct, gap, faltas from v_gap_controle($1, '2026-05-01', '2026-05-31')", [UNIDADE]);
    const cozinha = r.rows.find((x) => x.base === "cozinha");
    expect(n(cozinha.cmv_real_pct)).not.toBeNull();
    // Sem R3 de maio, o CMV teórico da base fica sem dado e o gap diz o que falta.
    expect(cozinha.cmv_teorico_pct).toBeNull();
    expect(cozinha.faltas.join(" ")).toContain("R3");
  });

  it("painel único traz todos os indicadores com valor ou com o que falta", async () => {
    const r = await db.query("select codigo, valor, semaforo, falta from v_painel_unico($1, '2026-05-01', '2026-05-31')", [UNIDADE]);
    expect(r.rows.length).toBeGreaterThanOrEqual(35);
    for (const row of r.rows) {
      expect(row.valor !== null || row.falta !== null, `${row.codigo} sem valor e sem falta`).toBe(true);
    }
    const ticket = r.rows.find((x) => x.codigo === "ticket_medio");
    perto(n(ticket.valor), 15000 / 80, 0.01);
    expect(r.rows.find((x) => x.codigo === "attach_entrada").falta).toContain("atendimentos");
    expect(arredondar(n(r.rows.find((x) => x.codigo === "prime_cost_pct").valor) as number, 4)).toBeGreaterThan(0);
  });
});
