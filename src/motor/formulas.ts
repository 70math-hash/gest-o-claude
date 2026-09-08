/**
 * Catálogo de fórmulas, dono, origem e frequência de cada indicador
 * (regra 7: toda métrica tem dono e fórmula; o painel mostra a fórmula ao
 * lado do número). A seção 5 é a única fonte; este arquivo só a repete
 * para a interface.
 */
export interface Formula {
  codigo: string;
  nome: string;
  formula: string;
  secao: string;
  dono: "dono" | "gestor" | "cozinha" | "salao";
  origem: string;
  frequencia: "diaria" | "semanal" | "mensal" | "trimestral" | "por_evento";
  /** Lançamento que destrava o indicador quando está sem dado. */
  faltaQuando: string;
}

export const FORMULAS: Formula[] = [
  { codigo: "custo_ficha", nome: "Custo da ficha", formula: "soma(custo_ingrediente) + soma(quantidade × custo_producao_por_kg), com custo_ingrediente = (quantidade_em_kg × preco_por_kg) / rendimento", secao: "5.1", dono: "gestor", origem: "fichas, insumo_precos, producoes", frequencia: "por_evento", faltaQuando: "ficha vigente e preço vigente de todos os insumos" },
  { codigo: "cmv_teorico_item", nome: "CMV teórico do item", formula: "custo_ficha / preco_venda", secao: "5.1", dono: "gestor", origem: "fichas, produto_precos", frequencia: "por_evento", faltaQuando: "ficha e preço de venda" },
  { codigo: "cmv_altec_item", nome: "CMV Altec do item", formula: "custo_altec_ficha / preco_venda (sem rendimento, só para comparar)", secao: "5.1", dono: "gestor", origem: "fichas", frequencia: "por_evento", faltaQuando: "ficha e preço de venda" },
  { codigo: "distorcao_rendimento", nome: "Distorção por rendimento", formula: "cmv_teorico_item − cmv_altec_item (alerta se > 0,03)", secao: "5.1", dono: "gestor", origem: "fichas", frequencia: "por_evento", faltaQuando: "ficha com rendimento" },
  { codigo: "cmv_ponderado_bloco", nome: "CMV ponderado do bloco", formula: "soma(custo_ficha × qtde) / soma(total_liquido)", secao: "5.1", dono: "gestor", origem: "vendas_itens (R3), fichas", frequencia: "semanal", faltaQuando: "importação do R3 do período" },
  { codigo: "cmv_ponderado_tabela", nome: "CMV de cardápio (preço cheio)", formula: "soma(custo_ficha × qtde) / soma(val_bruto)", secao: "5.1", dono: "gestor", origem: "vendas_itens (R3), fichas", frequencia: "semanal", faltaQuando: "importação do R3 do período" },
  { codigo: "margem_contribuicao_item", nome: "Margem de contribuição do item", formula: "preco_venda − custo_ficha − preco_venda × (imposto + taxa_pagamento)", secao: "5.1", dono: "gestor", origem: "fichas, parametros", frequencia: "por_evento", faltaQuando: "imposto e taxa de pagamento em Parâmetros" },
  { codigo: "cmv_2x1", nome: "CMV do dia com 2x1", formula: "(custo das pagas + custo das gratuitas) / soma dos preços das pagas", secao: "5.2", dono: "gestor", origem: "vendas_itens, combos_2x1", frequencia: "diaria", faltaQuando: "confirmação das gratuitas do dia" },
  { codigo: "preco_minimo", nome: "Preço mínimo", formula: "custo_ficha / meta_cmv_bloco", secao: "5.3", dono: "dono", origem: "fichas, metas_cmv", frequencia: "trimestral", faltaQuando: "ficha e meta do bloco" },
  { codigo: "preco_sugerido", nome: "Preço sugerido", formula: "arredondar para cima ao múltiplo de R$ 5,00 ≥ preco_minimo", secao: "5.3", dono: "dono", origem: "fichas, metas_cmv, secoes", frequencia: "trimestral", faltaQuando: "ficha e meta do bloco" },
  { codigo: "cmv_real_pct", nome: "CMV real por base", formula: "(estoque_inicial + compras_periodo − estoque_final) / receita_periodo_da_mesma_base", secao: "5.4", dono: "gestor", origem: "inventarios, compras, vendas_dia", frequencia: "mensal", faltaQuando: "dois inventários gerais fechados e compras do período" },
  { codigo: "gap_controle", nome: "Gap de controle", formula: "cmv_real_pct − cmv_teorico_ponderado_pct (mesma base, mesmo período)", secao: "5.4", dono: "gestor", origem: "inventarios, compras, vendas_itens, fichas", frequencia: "mensal", faltaQuando: "CMV real e CMV teórico da mesma base" },
  { codigo: "ponto_pedido", nome: "Ponto de pedido", formula: "consumo_medio_diario × prazo_entrega_dias + estoque_seguranca", secao: "5.4", dono: "gestor", origem: "inventarios, fornecedores", frequencia: "semanal", faltaQuando: "consumo médio e prazo do fornecedor" },
  { codigo: "giro_estoque", nome: "Giro de estoque", formula: "cmv_periodo / estoque_medio", secao: "5.4", dono: "gestor", origem: "inventarios", frequencia: "mensal", faltaQuando: "dois inventários gerais" },
  { codigo: "cobertura_dias", nome: "Cobertura em dias", formula: "estoque_medio / cmv_diario", secao: "5.4", dono: "gestor", origem: "inventarios", frequencia: "mensal", faltaQuando: "dois inventários gerais" },
  { codigo: "acuracidade", nome: "Acuracidade do inventário", formula: "itens cuja contagem bate com o sistema / itens contados", secao: "5.4", dono: "gestor", origem: "inventario_itens", frequencia: "semanal", faltaQuando: "contagem fechada" },
  { codigo: "perda_pct_cmv", nome: "Perdas sobre o CMV", formula: "valor_perdas / cmv_periodo", secao: "5.4", dono: "gestor", origem: "perdas", frequencia: "mensal", faltaQuando: "perdas lançadas e CMV do período" },
  { codigo: "demanda_projetada", nome: "Demanda projetada", formula: "média de venda daquele dia da semana (últimas 8 a 12 semanas) × fator_sazonal", secao: "5.5", dono: "cozinha", origem: "vendas_itens", frequencia: "diaria", faltaQuando: "8 semanas de vendas do mesmo dia" },
  { codigo: "producao_sugerida", nome: "Produção sugerida", formula: "demanda_projetada × fator_seguranca − saldo_dia_anterior", secao: "5.5", dono: "cozinha", origem: "vendas_itens, producao_diaria, parametros", frequencia: "diaria", faltaQuando: "demanda projetada e sobra do dia anterior" },
  { codigo: "aderencia_cronograma", nome: "Aderência ao cronograma", formula: "etapas conferidas dentro da janela / etapas do dia", secao: "5.5", dono: "cozinha", origem: "cronograma_etapas", frequencia: "semanal", faltaQuando: "conferido das etapas do dia" },
  { codigo: "desvio_rendimento", nome: "Desvio de rendimento", formula: "(rendimento_real − rendimento_declarado) / rendimento_declarado", secao: "5.5", dono: "cozinha", origem: "bateladas", frequencia: "por_evento", faltaQuando: "batelada pesada" },
  { codigo: "sobra_pct", nome: "Sobra", formula: "sobra / produzido", secao: "5.5", dono: "cozinha", origem: "producao_diaria", frequencia: "diaria", faltaQuando: "produzido e sobra do dia" },
  { codigo: "refugo_pct", nome: "Refugo", formula: "itens refeitos / itens produzidos", secao: "5.5", dono: "cozinha", origem: "producao_diaria", frequencia: "semanal", faltaQuando: "itens refeitos do dia" },
  { codigo: "cobertura_pop", nome: "Cobertura de POP", formula: "processos com POP testado / processos críticos", secao: "5.5", dono: "gestor", origem: "processos_criticos", frequencia: "trimestral", faltaQuando: "processos críticos cadastrados" },
  { codigo: "redundancia", nome: "Redundância", formula: "certificados nível ≥ 2 por processo crítico (mínimo 2)", secao: "5.5", dono: "gestor", origem: "certificacoes", frequencia: "trimestral", faltaQuando: "certificações lançadas" },
  { codigo: "receita_liquida", nome: "Receita líquida", formula: "receita_bruta − impostos − taxas_pagamento − comissoes_marketplace", secao: "5.6", dono: "dono", origem: "vendas_dia, parametros, canais", frequencia: "mensal", faltaQuando: "vendas do mês e imposto em Parâmetros" },
  { codigo: "margem_contribuicao", nome: "Margem de contribuição", formula: "receita_liquida − cmv − embalagem", secao: "5.6", dono: "dono", origem: "DRE", frequencia: "mensal", faltaQuando: "receita líquida e CMV real" },
  { codigo: "mc_pct", nome: "Margem de contribuição (%)", formula: "margem_contribuicao / receita_bruta", secao: "5.6", dono: "dono", origem: "DRE", frequencia: "mensal", faltaQuando: "margem de contribuição" },
  { codigo: "custos_fixos", nome: "Custos fixos", formula: "soma das contas de natureza fixo e semifixo do período", secao: "5.6", dono: "dono", origem: "despesas, folha_mensal, plano_contas", frequencia: "mensal", faltaQuando: "despesas e folha do mês" },
  { codigo: "resultado_operacional", nome: "Resultado operacional", formula: "margem_contribuicao − custos_fixos (antes de pró-labore e depreciação)", secao: "5.6", dono: "dono", origem: "DRE", frequencia: "mensal", faltaQuando: "DRE do mês" },
  { codigo: "prime_cost_pct", nome: "Prime cost", formula: "(cmv + folha_com_encargos) / receita_bruta", secao: "5.6", dono: "dono", origem: "DRE, folha_mensal", frequencia: "mensal", faltaQuando: "CMV real e folha do mês" },
  { codigo: "ponto_equilibrio_reais", nome: "Ponto de equilíbrio", formula: "custos_fixos / mc_pct", secao: "5.6", dono: "dono", origem: "DRE", frequencia: "mensal", faltaQuando: "custos fixos e margem de contribuição" },
  { codigo: "ponto_equilibrio_clientes", nome: "Ponto de equilíbrio em clientes", formula: "ponto_equilibrio_reais / ticket_medio", secao: "5.6", dono: "dono", origem: "DRE, vendas_dia", frequencia: "mensal", faltaQuando: "ponto de equilíbrio e ticket médio" },
  { codigo: "ponto_equilibrio_por_dia", nome: "Ponto de equilíbrio por dia", formula: "ponto_equilibrio_clientes / dias_abertos", secao: "5.6", dono: "dono", origem: "DRE, parametros", frequencia: "mensal", faltaQuando: "ponto de equilíbrio em clientes" },
  { codigo: "dia_de_virada", nome: "Dia de virada", formula: "primeiro dia do mês em que receita acumulada ≥ ponto_equilibrio_reais", secao: "5.6", dono: "dono", origem: "vendas_dia, DRE", frequencia: "mensal", faltaQuando: "vendas diárias do mês e ponto de equilíbrio" },
  { codigo: "margem_seguranca", nome: "Margem de segurança", formula: "(receita − ponto_equilibrio_reais) / receita", secao: "5.6", dono: "dono", origem: "DRE", frequencia: "mensal", faltaQuando: "ponto de equilíbrio" },
  { codigo: "ncg", nome: "Necessidade de capital de giro", formula: "estoque + contas_a_receber − contas_a_pagar", secao: "5.6", dono: "dono", origem: "inventarios, caixa_projecao", frequencia: "mensal", faltaQuando: "inventário, contas a receber e a pagar" },
  { codigo: "folha_pct", nome: "Folha sobre a receita", formula: "folha_com_encargos / receita_bruta", secao: "5.7", dono: "dono", origem: "folha_mensal, vendas_dia", frequencia: "mensal", faltaQuando: "folha do mês" },
  { codigo: "receita_por_hora", nome: "Receita por hora trabalhada", formula: "receita_dia / horas_trabalhadas_equipe", secao: "5.7", dono: "gestor", origem: "vendas_dia, escalas", frequencia: "diaria", faltaQuando: "escala com realizado do dia" },
  { codigo: "pratos_por_cozinheiro", nome: "Pratos por cozinheiro", formula: "pratos_produzidos / cozinheiros_no_turno", secao: "5.7", dono: "gestor", origem: "vendas_dia, escalas", frequencia: "diaria", faltaQuando: "vendas do dia e cozinheiros escalados" },
  { codigo: "receita_por_garcom", nome: "Receita por garçom", formula: "receita_das_mesas_atendidas / garcons_no_turno", secao: "5.7", dono: "gestor", origem: "vendas_dia, escalas", frequencia: "diaria", faltaQuando: "vendas por colaborador e garçons escalados" },
  { codigo: "horas_extras_pct", nome: "Horas extras sobre a folha", formula: "valor_horas_extras / folha_total", secao: "5.7", dono: "gestor", origem: "folha_mensal", frequencia: "mensal", faltaQuando: "folha do mês com horas extras" },
  { codigo: "absenteismo", nome: "Absenteísmo", formula: "faltas_nao_programadas / dias_escalados", secao: "5.7", dono: "gestor", origem: "escalas", frequencia: "mensal", faltaQuando: "escala com realizado" },
  { codigo: "turnover_dieese", nome: "Turnover (DIEESE, padrão)", formula: "min(admissoes, desligamentos) / efetivo_medio", secao: "5.7", dono: "dono", origem: "colaboradores", frequencia: "mensal", faltaQuando: "admissões e desligamentos do período" },
  { codigo: "turnover_interno", nome: "Turnover (interno, alternativo)", formula: "((admissoes + desligamentos) / 2) / efetivo_medio", secao: "5.7", dono: "dono", origem: "colaboradores", frequencia: "mensal", faltaQuando: "admissões e desligamentos do período" },
  { codigo: "tempo_medio_casa", nome: "Tempo médio de casa", formula: "média de meses entre admissão e hoje ou desligamento", secao: "5.7", dono: "dono", origem: "colaboradores", frequencia: "mensal", faltaQuando: "colaboradores cadastrados" },
  { codigo: "ticket_medio", nome: "Ticket médio", formula: "receita_bruta / clientes", secao: "5.8", dono: "gestor", origem: "vendas_dia", frequencia: "diaria", faltaQuando: "número de clientes do dia" },
  { codigo: "giro_por_cadeira", nome: "Giro por cadeira", formula: "clientes_atendidos / cadeiras (já embute a ocupação)", secao: "5.8", dono: "salao", origem: "vendas_dia, parametros", frequencia: "diaria", faltaQuando: "clientes do dia e cadeiras em Parâmetros" },
  { codigo: "giro_por_mesa", nome: "Giro por mesa", formula: "atendimentos / mesas", secao: "5.8", dono: "salao", origem: "atendimentos, parametros", frequencia: "diaria", faltaQuando: "atendimentos do dia" },
  { codigo: "taxa_ocupacao", nome: "Taxa de ocupação", formula: "cadeiras_ocupadas / cadeiras (diagnóstico, nunca multiplicar pelo giro)", secao: "5.8", dono: "salao", origem: "atendimentos, parametros", frequencia: "diaria", faltaQuando: "atendimentos do dia" },
  { codigo: "attach_entrada", nome: "Attach de entrada", formula: "mesas com entrada / mesas atendidas", secao: "5.8", dono: "salao", origem: "atendimentos", frequencia: "semanal", faltaQuando: "atendimentos com itens por mesa" },
  { codigo: "attach_sobremesa", nome: "Attach de sobremesa", formula: "mesas com sobremesa / mesas atendidas", secao: "5.8", dono: "salao", origem: "atendimentos", frequencia: "semanal", faltaQuando: "atendimentos com itens por mesa" },
  { codigo: "attach_bebida", nome: "Attach de bebida", formula: "mesas com bebida / mesas atendidas", secao: "5.8", dono: "salao", origem: "atendimentos", frequencia: "semanal", faltaQuando: "atendimentos com itens por mesa" },
  { codigo: "tempo_a_mesa", nome: "Tempo à mesa", formula: "saida − chegada", secao: "5.8", dono: "salao", origem: "atendimentos", frequencia: "diaria", faltaQuando: "chegada e saída por atendimento" },
  { codigo: "no_show", nome: "No-show", formula: "reservas não comparecidas / reservas confirmadas", secao: "5.8", dono: "salao", origem: "reservas", frequencia: "semanal", faltaQuando: "reservas com status" },
  { codigo: "base_que_retorna", nome: "Base que retorna", formula: "clientes com mais de uma visita / clientes únicos", secao: "5.8", dono: "dono", origem: "clientes", frequencia: "mensal", faltaQuando: "cadastro de clientes com visitas" },
  { codigo: "retencao_90d", nome: "Retenção em 90 dias", formula: "clientes novos que voltaram em 90 dias / clientes novos", secao: "5.8", dono: "dono", origem: "clientes", frequencia: "trimestral", faltaQuando: "cadastro de clientes com visitas" },
  { codigo: "mc_canal", nome: "Margem por canal", formula: "preco − preco × comissao − preco × taxa_pagamento − embalagem − entrega − custo_ficha", secao: "5.9", dono: "dono", origem: "canais, fichas", frequencia: "trimestral", faltaQuando: "parâmetros do canal" },
  { codigo: "preco_equivalencia", nome: "Preço de equivalência", formula: "(mc_salao + embalagem + custo_ficha + entrega) / (1 − comissao − taxa_pagamento)", secao: "5.9", dono: "dono", origem: "canais, fichas", frequencia: "trimestral", faltaQuando: "parâmetros do canal" },
  { codigo: "entrega_de_virada", nome: "Entrega de virada", formula: "custo de entrega acima do qual o plano em que a casa entrega perde para o plano em que a plataforma entrega", secao: "5.9", dono: "dono", origem: "canais, fichas", frequencia: "trimestral", faltaQuando: "parâmetros dos dois planos" },
  { codigo: "engenharia_cardapio", nome: "Engenharia de cardápio", formula: "popularidade_alta = participação ≥ fator × (1 / itens do bloco); margem_alta = MC ≥ MC média ponderada (Kasavana-Smith) ou CMV ≤ CMV ponderado (Miller)", secao: "5.10", dono: "dono", origem: "vendas_itens (90 dias), fichas", frequencia: "trimestral", faltaQuando: "90 dias de vendas importadas" },
];

export function formulaPorCodigo(codigo: string): Formula | undefined {
  return FORMULAS.find((f) => f.codigo === codigo);
}
