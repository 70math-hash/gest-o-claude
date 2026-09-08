import { describe, expect, it } from "vitest";
import { arredondar, arredondarParaCimaMultiplo, validarRendimento, ErroBloqueio } from "./numero";
import { converterParaBase } from "./custo";
import { identificarGratuitas } from "./dois_por_um";
import { verificarFaixa } from "./precificacao";
import { cmvRealReais, decomposicaoGap, gapControle, pontoPedido } from "./estoque";
import { aderenciaCronograma, alertaSobraTresDias, demandaProjetada, desvioRendimento, etapaConferidaNaJanela, producaoSugerida, redundancia } from "./producao";
import { aliquotaEfetivaSimples, faixaSimples } from "./simples";
import { diaDeVirada, custosFixos } from "./financeiro";
import { turnoverDieese, turnoverInterno, horasExtrasPct, horasDoDia } from "./gente";
import { attach, capacidadeForno, giroPorCadeira } from "./salao";
import { alertaCmvItem, alertaDocumentoRisco, alertaGramagem } from "./alertas";

describe("números", () => {
  it("arredonda meio para cima em decimal", () => {
    expect(arredondar(43.295, 2)).toBe(43.3);
    expect(arredondar(1.005, 2)).toBe(1.01);
    expect(arredondar(2.675, 2)).toBe(2.68);
    expect(arredondar(-1.005, 2)).toBe(-1.01);
    expect(arredondar(1904.7619, 1)).toBe(1904.8);
  });
  it("arredonda para cima ao múltiplo de 5", () => {
    expect(arredondarParaCimaMultiplo(85, 5)).toBe(85);
    expect(arredondarParaCimaMultiplo(85.01, 5)).toBe(90);
    expect(arredondarParaCimaMultiplo(102.44, 5)).toBe(105);
  });
  it("rendimento fora da faixa é bloqueio", () => {
    expect(() => validarRendimento(0)).toThrow(ErroBloqueio);
    expect(() => validarRendimento(1.2)).toThrow(ErroBloqueio);
    expect(() => validarRendimento(null)).toThrow(ErroBloqueio);
    expect(validarRendimento(0.88)).toBe(0.88);
  });
  it("converte unidades da ficha para a base do insumo", () => {
    expect(converterParaBase(350, "g", "kg")).toBe(0.35);
    expect(converterParaBase(20, "ml", "l")).toBe(0.02);
    expect(() => converterParaBase(20, "g", "un")).toThrow(ErroBloqueio);
  });
});

describe("2x1: identificação das gratuitas", () => {
  it("desconto de 100% na linha marca gratuita; combo fixo marca gratuita; o resto pede confirmação", () => {
    const r = identificarGratuitas(
      [
        { idAltec: "100018", qtde: 2, vlTabela: 55, descProd: 110, descGlobal: 0, total: 0 },
        { idAltec: "100010", qtde: 1, vlTabela: 58, descProd: 0, descGlobal: 0, total: 58 },
        { idAltec: "100190", qtde: 2, vlTabela: 95, descProd: 0, descGlobal: 0, total: 190 },
      ],
      [{ idGratuito: "100010", idPago: "100205" }],
      true,
    );
    expect(r[0]!.origem).toBe("desconto_100");
    expect(r[1]!.origem).toBe("combo_fixo");
    expect(r[2]!.origem).toBe("confirmar");
  });
});

describe("precificação: piso e teto alertam e não bloqueiam", () => {
  it("classifica dentro, abaixo e acima", () => {
    expect(verificarFaixa(70, 58, 150).situacao).toBe("dentro");
    expect(verificarFaixa(50, 58, 150).alerta).toBe(true);
    expect(verificarFaixa(160, 58, 150).situacao).toBe("acima_do_teto");
  });
});

describe("estoque e gap", () => {
  it("CMV real por estoque e gap na mesma base", () => {
    expect(cmvRealReais(10_000, 45_000, 12_000)).toBe(43_000);
    const g = gapControle({ base: "cozinha", cmvRealPct: 0.31, cmvTeoricoPct: 0.28 });
    expect(Math.abs(g.gap - 0.03)).toBeLessThan(1e-9);
    expect(g.alerta).toBe(true);
  });
  it("decomposição só atribui o que foi lançado", () => {
    const d = decomposicaoGap({ gapReais: 5000, perdasRegistradas: 1200, cortesiasRegistradas: 300, ajustesContagem: 0 });
    expect(d.naoExplicado).toBe(3500);
    expect(d.sugestoes.length).toBe(4);
  });
  it("ponto de pedido", () => {
    expect(pontoPedido(2.5, 3, 4)).toBe(11.5);
  });
});

describe("produção", () => {
  it("demanda projetada exige 8 semanas e usa no máximo 12", () => {
    expect(demandaProjetada([10, 12, 11]).valor).toBeNull();
    const d = demandaProjetada([10, 12, 11, 9, 10, 12, 11, 9, 100, 100, 100, 100, 100], 1.1);
    expect(d.semanasUsadas).toBe(12);
    expect(d.valor).toBeCloseTo(((10 + 12 + 11 + 9 + 10 + 12 + 11 + 9 + 100 + 100 + 100 + 100) / 12) * 1.1, 6);
  });
  it("produção sugerida desconta o saldo e nunca é negativa", () => {
    expect(producaoSugerida(20, 1.1, 5)).toBe(17);
    expect(producaoSugerida(20, 1.1, 50)).toBe(0);
  });
  it("aderência e janela", () => {
    const fim = new Date("2026-09-08T17:00:00-03:00");
    expect(etapaConferidaNaJanela({ horaFim: fim, conferidoEm: new Date("2026-09-08T16:59:00-03:00") })).toBe(true);
    expect(etapaConferidaNaJanela({ horaFim: fim, conferidoEm: new Date("2026-09-08T17:01:00-03:00") })).toBe(false);
    expect(aderenciaCronograma(19, 20)).toBe(0.95);
  });
  it("desvio de rendimento acima de 3% alerta", () => {
    expect(desvioRendimento(2.1, 2.2).alerta).toBe(true);
    expect(desvioRendimento(2.15, 2.2).alerta).toBe(false);
  });
  it("sobra acima de 5% por três dias sugere novo fator", () => {
    expect(alertaSobraTresDias([0.06, 0.08, 0.07], 1.1).alerta).toBe(true);
    expect(alertaSobraTresDias([0.06, 0.02, 0.07], 1.1).alerta).toBe(false);
  });
  it("redundância mínima de 2 certificados nível ≥ 2", () => {
    const r = redundancia([{ processoId: "a", nivel: 3 }, { processoId: "a", nivel: 1 }], [{ id: "a", nome: "Abertura do forno" }]);
    expect(r[0]!.certificados).toBe(1);
    expect(r[0]!.alerta).toBe(true);
  });
});

describe("Simples Nacional, Anexo I", () => {
  it("alíquota efetiva por faixa", () => {
    expect(aliquotaEfetivaSimples(100_000)).toBeCloseTo(0.04, 6);
    expect(faixaSimples(1_800_000)!.numero).toBe(4);
    expect(aliquotaEfetivaSimples(1_800_000)).toBeCloseTo((1_800_000 * 0.107 - 22_500) / 1_800_000, 6);
    expect(aliquotaEfetivaSimples(3_600_000)).toBeCloseTo((3_600_000 * 0.143 - 87_300) / 3_600_000, 6);
    expect(aliquotaEfetivaSimples(4_800_000)).toBeCloseTo(0.11125, 6);
    expect(aliquotaEfetivaSimples(5_000_000)).toBeNull();
  });
});

describe("financeiro", () => {
  it("dia de virada é o primeiro dia em que o acumulado alcança o ponto de equilíbrio", () => {
    expect(diaDeVirada([{ dia: 1, receita: 100 }, { dia: 2, receita: 100 }, { dia: 3, receita: 100 }], 250)).toBe(3);
    expect(diaDeVirada([{ dia: 1, receita: 100 }], 250)).toBeNull();
  });
  it("custos fixos somam fixo e semifixo", () => {
    expect(custosFixos([{ natureza: "fixo", valor: 10 }, { natureza: "semifixo", valor: 5 }, { natureza: "variavel", valor: 99 }])).toBe(15);
  });
});

describe("gente", () => {
  it("turnover nas duas fórmulas", () => {
    expect(turnoverDieese(2, 3, 20)).toBe(0.1);
    expect(turnoverInterno(2, 3, 20)).toBe(0.125);
  });
  it("horas extras acima de 5% alerta", () => {
    expect(horasExtrasPct(6, 100).alerta).toBe(true);
  });
  it("horas do dia a partir do realizado", () => {
    const h = horasDoDia({ entrada: new Date("2026-09-08T16:00:00-03:00"), saida: new Date("2026-09-09T00:00:00-03:00"), realizadoEntrada: new Date("2026-09-08T16:00:00-03:00"), realizadoSaida: new Date("2026-09-09T01:00:00-03:00") });
    expect(h.previstas).toBe(8);
    expect(h.extras).toBe(1);
  });
});

describe("salão", () => {
  it("attach por categoria", () => {
    const a = attach([{ teveEntrada: true, teveSobremesa: false, teveBebida: true }, { teveEntrada: false, teveSobremesa: true, teveBebida: true }]);
    expect(a.entrada).toBe(0.5);
    expect(a.bebida).toBe(1);
  });
  it("capacidade do forno é a soma das quatro faixas, pico guardado separado", () => {
    expect(capacidadeForno([12, 18, 16, 14])).toEqual({ pizzasPorHora: 60, pico15min: 18 });
  });
  it("giro por cadeira", () => {
    expect(giroPorCadeira(120, 60)).toBe(2);
  });
});

describe("alertas da seção 8", () => {
  it("gramagem suspeita pede confirmação", () => {
    expect(alertaGramagem(330)?.nivel).toBe("confirmacao");
    expect(alertaGramagem(0.0001)?.nivel).toBe("confirmacao");
    expect(alertaGramagem(0.09)).toBeNull();
  });
  it("entrada acima de 33% é crítico; acima da meta é alerta", () => {
    expect(alertaCmvItem(0.374, 0.25, "entrada")?.nivel).toBe("critico");
    expect(alertaCmvItem(0.27, 0.25, "entrada")?.nivel).toBe("alerta");
    expect(alertaCmvItem(0.2, 0.25, "entrada")).toBeNull();
  });
  it("documento de risco em 60 dias alerta; vencido é crítico", () => {
    const hoje = new Date("2026-09-08T12:00:00-03:00");
    expect(alertaDocumentoRisco(new Date("2026-10-08T12:00:00-03:00"), hoje)?.nivel).toBe("alerta");
    expect(alertaDocumentoRisco(new Date("2026-09-01T12:00:00-03:00"), hoje)?.nivel).toBe("critico");
    expect(alertaDocumentoRisco(new Date("2027-09-01T12:00:00-03:00"), hoje)).toBeNull();
  });
});
