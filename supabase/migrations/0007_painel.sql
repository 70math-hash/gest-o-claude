-- QT GESTÃO · 0007 · Painel único: todos os indicadores com valor, meta,
-- semáforo em quatro tons e o que falta lançar quando estiver sem dado.

-- Semáforo: 'otimo', 'atencao', 'alerta', 'critico' (tons de cinza e preto na tela).
-- sentido 'menor' = quanto menor melhor (CMV); 'maior' = quanto maior melhor (aderência).
create or replace function f_semaforo(valor numeric, meta numeric, teto numeric, sentido text)
returns text language sql immutable as $$
  select case
    when valor is null or meta is null then null
    when sentido = 'menor' then case
      when valor <= meta then 'otimo'
      when valor <= coalesce(teto, meta + 0.02) then 'atencao'
      when valor <= coalesce(teto, meta + 0.02) + 0.05 then 'alerta'
      else 'critico' end
    else case
      when valor >= meta then 'otimo'
      when valor >= meta - 0.05 then 'atencao'
      when valor >= meta - 0.15 then 'alerta'
      else 'critico' end
  end
$$;

create or replace function v_painel_unico(p_unidade uuid, p_inicio date, p_fim date)
returns table (codigo text, valor numeric, tipo_valor text, meta numeric, teto numeric, semaforo text, falta text, detalhe text)
language plpgsql stable as $$
#variable_conflict use_column
declare
  mes date := date_trunc('month', p_fim)::date;
  r record; m record; par parametros%rowtype; pe record; pc record; tv record; he record; at record; rec record; gp record;
  v numeric; d text;
begin
  select * into par from parametros where unidade_id = p_unidade;

  -- CMV teórico ponderado por bloco.
  for r in select * from v_cmv_ponderado_bloco(p_unidade, p_inicio, p_fim) where bloco in ('pizza','entrada','sobremesa') loop
    codigo := 'cmv_ponderado_' || r.bloco::text; valor := r.cmv_operacional; tipo_valor := 'pct'; meta := r.meta_pct; teto := r.teto_pct;
    semaforo := f_semaforo(valor, meta, teto, 'menor');
    falta := case when r.receita_liquida = 0 then 'importação do R3 do período' when r.itens_sem_custo > 0 then r.itens_sem_custo || ' produto(s) sem custo (ficha ou preço de insumo)' end;
    detalhe := case when r.linhas_sem_produto > 0 then r.linhas_sem_produto || ' linha(s) sem mapeamento' end;
    return next;
  end loop;

  -- CMV real por base e da casa.
  for r in select * from v_gap_controle(p_unidade, p_inicio, p_fim) loop
    codigo := 'cmv_real_' || r.base::text; valor := r.cmv_real_pct; tipo_valor := 'pct'; meta := null; teto := null; semaforo := null;
    falta := case when valor is null then array_to_string(r.faltas, '; ') end; detalhe := null; return next;
    codigo := 'gap_' || r.base::text; valor := r.gap; tipo_valor := 'pp'; meta := 0.02; teto := 0.02; semaforo := f_semaforo(valor, meta, teto, 'menor');
    falta := case when valor is null then array_to_string(r.faltas, '; ') end;
    detalhe := case when r.nao_explicado is not null then 'não explicado: ' || round(r.nao_explicado, 2) end; return next;
  end loop;
  select m1.meta_pct, m1.teto_pct into m from f_meta_bloco(p_unidade, 'casa', p_fim) m1;
  select sum(cmv_real_reais) filter (where cmv_real_reais is not null) as cmv, sum(receita) as rec, count(*) filter (where cmv_real_reais is null) as faltando
  into r from (select * from v_cmv_real_base(p_unidade, p_inicio, p_fim, 'cozinha') union all select * from v_cmv_real_base(p_unidade, p_inicio, p_fim, 'bar')) x;
  codigo := 'cmv_real_casa'; valor := case when r.faltando = 0 and r.rec > 0 then r.cmv / r.rec end; tipo_valor := 'pct'; meta := m.meta_pct; teto := m.teto_pct;
  semaforo := f_semaforo(valor, meta, teto, 'menor'); falta := case when valor is null then 'inventário geral fechado de cozinha e bar e receita do período' end; detalhe := null; return next;

  -- Financeiro do mês de referência.
  select * into pe from v_ponto_equilibrio(p_unidade, mes);
  select * into pc from v_prime_cost(p_unidade, mes);
  codigo := 'prime_cost_pct'; valor := pc.prime_cost_pct; tipo_valor := 'pct'; meta := null; teto := null; semaforo := null; falta := case when valor is null then array_to_string(pc.faltas, '; ') end; detalhe := null; return next;
  codigo := 'mc_pct'; valor := pe.mc_pct; tipo_valor := 'pct'; meta := null; teto := null; semaforo := null; falta := case when valor is null then array_to_string(pe.faltas, '; ') end; return next;
  codigo := 'ponto_equilibrio_reais'; valor := pe.ponto_equilibrio_reais; tipo_valor := 'reais'; falta := case when valor is null then array_to_string(pe.faltas, '; ') end; return next;
  codigo := 'ponto_equilibrio_por_dia'; valor := pe.ponto_equilibrio_por_dia; tipo_valor := 'numero'; falta := case when valor is null then array_to_string(pe.faltas, '; ') end; return next;
  codigo := 'dia_de_virada'; valor := extract(day from pe.dia_de_virada); tipo_valor := 'dia'; falta := case when pe.dia_de_virada is null and pe.ponto_equilibrio_reais is not null then 'receita acumulada ainda não alcançou o ponto de equilíbrio' when pe.dia_de_virada is null then array_to_string(pe.faltas, '; ') end; return next;
  codigo := 'margem_seguranca'; valor := pe.margem_seguranca; tipo_valor := 'pct'; meta := 0; teto := null; semaforo := case when valor is null then null when valor >= 0.15 then 'otimo' when valor >= 0.05 then 'atencao' when valor >= 0 then 'alerta' else 'critico' end; falta := case when valor is null then array_to_string(pe.faltas, '; ') end; return next;
  select max(valor) filter (where d1.codigo = 'resultado_operacional') as res, max(vertical) filter (where d1.codigo = 'resultado_operacional') as pct, max(vertical) filter (where d1.codigo = 'folha') as folha, max(falta) filter (where d1.codigo = 'folha') as folha_falta into r from v_dre_vertical(p_unidade, mes) d1;
  codigo := 'resultado_operacional_pct'; valor := r.pct; tipo_valor := 'pct'; meta := null; semaforo := null; falta := case when valor is null then array_to_string(pe.faltas, '; ') end; return next;
  codigo := 'folha_pct'; valor := -r.folha; tipo_valor := 'pct'; meta := null; semaforo := null; falta := case when valor is null then coalesce(r.folha_falta, 'folha do mês e receita') end; return next;

  -- Gente.
  select * into tv from v_turnover(p_unidade, p_inicio, p_fim);
  codigo := 'turnover_dieese'; valor := tv.turnover_dieese; tipo_valor := 'pct'; meta := null; semaforo := null; falta := case when valor is null then 'colaboradores cadastrados com admissão e desligamento' end; detalhe := 'fórmula DIEESE em uso'; return next;
  codigo := 'turnover_interno'; valor := tv.turnover_interno; tipo_valor := 'pct'; falta := case when valor is null then 'colaboradores cadastrados' end; detalhe := 'alternativo'; return next;
  codigo := 'tempo_medio_casa'; valor := tv.tempo_medio_casa_meses; tipo_valor := 'meses'; falta := case when valor is null then 'colaboradores cadastrados' end; detalhe := null; return next;
  select * into he from v_horas_equipe(p_unidade, p_inicio, p_fim);
  codigo := 'absenteismo'; valor := he.absenteismo; tipo_valor := 'pct'; meta := null; semaforo := null; falta := case when valor is null then 'escala com realizado' end; return next;
  select case when sum(salario + encargos + beneficios + horas_extras_valor) > 0 then sum(horas_extras_valor) / sum(salario + encargos + beneficios + horas_extras_valor) end into v from folha_mensal where unidade_id = p_unidade and competencia = mes;
  codigo := 'horas_extras_pct'; valor := v; tipo_valor := 'pct'; meta := 0.05; teto := 0.05; semaforo := f_semaforo(valor, meta, teto, 'menor'); falta := case when valor is null then 'folha do mês com horas extras' end; return next;
  select * into rec from f_receita_periodo(p_unidade, p_inicio, p_fim);
  codigo := 'receita_por_hora'; valor := case when he.horas_trabalhadas > 0 then rec.receita / he.horas_trabalhadas end; tipo_valor := 'reais'; meta := null; teto := null; semaforo := null; falta := case when valor is null then 'escala com realizado e fechamento do dia' end; return next;
  codigo := 'pratos_por_cozinheiro'; valor := case when rec.pratos is not null and rec.dias_com_venda > 0 and par.cozinheiros_padrao > 0 then rec.pratos::numeric / rec.dias_com_venda / par.cozinheiros_padrao end; tipo_valor := 'numero'; falta := case when valor is null then 'pratos vendidos no fechamento do dia' end; detalhe := 'cozinheiros por turno: ' || coalesce(par.cozinheiros_padrao::text, 'sem dado'); return next;
  select case when count(distinct vc.codigo) > 0 then sum(vc.receita) / count(distinct vc.codigo || vc.data::text) end into v from vendas_colaborador_dia vc where vc.unidade_id = p_unidade and vc.data between p_inicio and p_fim and vc.segmento in ('cozinha','salao');
  codigo := 'receita_por_garcom'; valor := v; tipo_valor := 'reais'; falta := case when valor is null then 'importação diária por colaborador' end; detalhe := null; return next;

  -- Salão.
  codigo := 'ticket_medio'; valor := case when rec.clientes > 0 then rec.receita / rec.clientes end; tipo_valor := 'reais'; falta := case when valor is null then 'número de clientes no fechamento do dia' end; return next;
  codigo := 'giro_por_cadeira'; valor := case when par.cadeiras > 0 and rec.dias_com_venda > 0 then rec.clientes::numeric / rec.dias_com_venda / par.cadeiras end; tipo_valor := 'numero'; falta := case when valor is null then 'clientes do dia e cadeiras em Parâmetros' end; return next;
  select * into at from v_attach(p_unidade, p_inicio, p_fim);
  codigo := 'giro_por_mesa'; valor := case when par.mesas > 0 and rec.dias_com_venda > 0 and at.mesas > 0 then at.mesas::numeric / rec.dias_com_venda / par.mesas end; tipo_valor := 'numero'; falta := case when valor is null then 'atendimentos por mesa e mesas em Parâmetros' end; return next;
  codigo := 'attach_entrada'; valor := at.attach_entrada; tipo_valor := 'pct'; falta := case when valor is null then 'atendimentos com itens por mesa (export por comanda ou captura no salão)' end; return next;
  codigo := 'attach_sobremesa'; valor := at.attach_sobremesa; tipo_valor := 'pct'; falta := case when valor is null then 'atendimentos com itens por mesa' end; return next;
  codigo := 'attach_bebida'; valor := at.attach_bebida; tipo_valor := 'pct'; falta := case when valor is null then 'atendimentos com itens por mesa' end; return next;
  codigo := 'tempo_a_mesa'; valor := at.tempo_medio_mesa_min; tipo_valor := 'min'; falta := case when valor is null then 'chegada e saída por atendimento' end; return next;
  select case when count(*) filter (where status in ('confirmada','compareceu','no_show')) > 0 then count(*) filter (where status = 'no_show')::numeric / count(*) filter (where status in ('confirmada','compareceu','no_show')) end into v from reservas where unidade_id = p_unidade and data between p_inicio and p_fim;
  codigo := 'no_show'; valor := v; tipo_valor := 'pct'; falta := case when valor is null then 'reservas com status' end; return next;
  select case when count(*) > 0 then count(*) filter (where visitas > 1)::numeric / count(*) end into v from clientes where unidade_id = p_unidade;
  codigo := 'base_que_retorna'; valor := v; tipo_valor := 'pct'; falta := case when valor is null then 'cadastro de clientes com visitas' end; return next;
  select case when count(*) filter (where primeira_visita between p_inicio - 90 and p_fim - 90) > 0 then count(*) filter (where primeira_visita between p_inicio - 90 and p_fim - 90 and visitas > 1 and ultima_visita <= primeira_visita + 90)::numeric / count(*) filter (where primeira_visita between p_inicio - 90 and p_fim - 90) end into v from clientes where unidade_id = p_unidade;
  codigo := 'retencao_90d'; valor := v; tipo_valor := 'pct'; falta := case when valor is null then 'clientes novos há mais de 90 dias' end; return next;

  -- Processo.
  select case when sum(etapas) > 0 then sum(conferidas_na_janela)::numeric / sum(etapas) end into v from v_aderencia_cronograma(p_unidade, p_inicio, p_fim);
  codigo := 'aderencia_cronograma'; valor := v; tipo_valor := 'pct'; meta := 0.95; teto := null; semaforo := f_semaforo(valor, meta, null, 'maior'); falta := case when valor is null then 'conferido das etapas do cronograma' end; return next;
  select avg(abs(desvio)) as media, count(*) filter (where alerta) as n into r from v_desvio_rendimento(p_unidade, p_inicio, p_fim);
  codigo := 'desvio_rendimento'; valor := r.media; tipo_valor := 'pct'; meta := 0.03; teto := 0.03; semaforo := f_semaforo(valor, meta, teto, 'menor'); falta := case when valor is null then 'bateladas pesadas no período' end; detalhe := case when r.n > 0 then r.n || ' batelada(s) acima de 3%' end; return next;
  select case when sum(produzido) > 0 then sum(sobra) / sum(produzido) end as pct, count(*) filter (where alerta) as n into r from v_sobra(p_unidade, p_inicio, p_fim);
  codigo := 'sobra_pct'; valor := r.pct; tipo_valor := 'pct'; meta := 0.05; teto := 0.05; semaforo := f_semaforo(valor, meta, teto, 'menor'); falta := case when valor is null then 'produzido e sobra na produção do dia' end; detalhe := case when r.n > 0 then r.n || ' item(ns) três dias acima de 5%' end; return next;
  select case when sum(produzido) > 0 then sum(refeitos) / sum(produzido) end into v from producao_diaria where unidade_id = p_unidade and data between p_inicio and p_fim and produzido is not null;
  codigo := 'refugo_pct'; valor := v; tipo_valor := 'pct'; meta := null; teto := null; semaforo := null; falta := case when valor is null then 'itens refeitos na produção do dia' end; detalhe := null; return next;
  select case when count(*) > 0 then count(*) filter (where pop_testado_em is not null)::numeric / count(*) end into v from processos_criticos where unidade_id = p_unidade and ativo;
  codigo := 'cobertura_pop'; valor := v; tipo_valor := 'pct'; meta := 1; semaforo := f_semaforo(valor, 1, null, 'maior'); falta := case when valor is null then 'processos críticos cadastrados' end; return next;
  select count(*) filter (where n < 2) as sem, count(*) as total into r from (select p.id, count(c.id) filter (where c.nivel >= 2) as n from processos_criticos p left join certificacoes c on c.processo_id = p.id where p.unidade_id = p_unidade and p.ativo group by p.id) x;
  codigo := 'redundancia'; valor := r.sem; tipo_valor := 'numero'; meta := 0; teto := 0; semaforo := case when r.total = 0 then null when r.sem = 0 then 'otimo' when r.sem <= 2 then 'alerta' else 'critico' end; falta := case when r.total = 0 then 'processos críticos e certificações' end; detalhe := 'processos com menos de 2 certificados'; return next;

  -- Controle.
  select sum(abs(divergencia)) as total, count(*) filter (where divergencia <> 0) as n into r from conciliacao_dia where unidade_id = p_unidade and data between p_inicio and p_fim;
  codigo := 'divergencia_conciliacao'; valor := r.total; tipo_valor := 'reais'; meta := 0; teto := 0; semaforo := case when r.total is null then null when r.total = 0 then 'otimo' else 'alerta' end; falta := case when r.total is null then 'os quatro números da conciliação no fechamento do dia' end; detalhe := case when r.n > 0 then r.n || ' dia(s) com divergência' end; return next;
  select count(*) into v from documentos_risco where unidade_id = p_unidade and vencimento <= p_fim + alerta_dias;
  codigo := 'documentos_risco'; valor := v; tipo_valor := 'numero'; meta := 0; teto := 0; semaforo := case when v = 0 then 'otimo' when exists (select 1 from documentos_risco where unidade_id = p_unidade and vencimento < p_fim) then 'critico' else 'alerta' end; falta := null; detalhe := 'vencendo em 60 dias ou vencidos'; return next;
  select sum(valor) into v from perdas where unidade_id = p_unidade and data between p_inicio and p_fim;
  select sum(cmv_real_reais) as total into r from (select * from v_cmv_real_base(p_unidade, p_inicio, p_fim, 'cozinha') union all select * from v_cmv_real_base(p_unidade, p_inicio, p_fim, 'bar')) x;
  codigo := 'perda_pct_cmv'; valor := case when r.total > 0 then coalesce(v, 0) / r.total end; tipo_valor := 'pct'; meta := null; teto := null; semaforo := null; falta := case when valor is null then 'perdas lançadas e CMV real do período' end; detalhe := null; return next;
end $$;
