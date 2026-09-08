-- QT GESTÃO · 0006 · Indicadores (seções 5.4 a 5.10) espelhando src/motor.

-- Receita bruta do período a partir do fechamento do dia (sem taxa de serviço, D-015).
create or replace function f_receita_periodo(p_unidade uuid, p_inicio date, p_fim date)
returns table (receita numeric, taxa_servico numeric, clientes bigint, comandas bigint, dias_com_venda bigint, pratos bigint)
language sql stable as $$
  select sum(faturamento_bruto), sum(taxa_servico), sum(clientes), sum(comandas), count(*) filter (where faturamento_bruto > 0), sum(pratos_vendidos)
  from vendas_dia where unidade_id = p_unidade and data between p_inicio and p_fim
$$;

-- Receita de uma base (cozinha ou bar) num intervalo (inicio exclusivo, fim inclusivo).
-- Usa os itens do R3 quando existem; senão os segmentos do fechamento do dia.
create or replace function f_receita_base(p_unidade uuid, p_inicio_excl date, p_fim_incl date, p_base base_estoque)
returns table (receita numeric, origem text)
language plpgsql stable as $$
#variable_conflict use_column
declare r numeric;
begin
  select sum(v.total) into r from vendas_itens v join produtos p on p.id = v.produto_id
  where v.unidade_id = p_unidade and v.data > p_inicio_excl and v.data <= p_fim_incl
    and ((p_base = 'cozinha' and p.bloco in ('pizza','entrada','sobremesa')) or (p_base = 'bar' and p.bloco in ('bar','salao')));
  if r is not null then
    return query select r, 'vendas_itens'::text; return;
  end if;
  select sum(case when p_base = 'cozinha' then coalesce((por_segmento->>'cozinha')::numeric, 0) + coalesce((por_segmento->>'delivery')::numeric, 0)
                  else coalesce((por_segmento->>'bar')::numeric, 0) + coalesce((por_segmento->>'salao')::numeric, 0) end)
  into r from vendas_dia where unidade_id = p_unidade and data > p_inicio_excl and data <= p_fim_incl and por_segmento <> '{}'::jsonb;
  return query select r, case when r is null then null else 'vendas_dia' end;
end $$;

-- RBT12: receita bruta dos doze meses anteriores à competência.
create or replace function f_rbt12(p_unidade uuid, p_competencia date)
returns table (rbt12 numeric, meses_com_dado integer)
language sql stable as $$
  select sum(faturamento_bruto), count(distinct date_trunc('month', data))::integer
  from vendas_dia
  where unidade_id = p_unidade and data >= (date_trunc('month', p_competencia) - interval '12 months')::date and data < date_trunc('month', p_competencia)::date
$$;

-- Simples Nacional, Anexo I (D-008).
create or replace function f_aliquota_simples(p_rbt12 numeric) returns numeric
language sql immutable as $$
  select case
    when p_rbt12 is null or p_rbt12 < 0 or p_rbt12 > 4800000 then null
    when p_rbt12 = 0 then 0.04
    when p_rbt12 <= 180000 then (p_rbt12 * 0.04) / p_rbt12
    when p_rbt12 <= 360000 then (p_rbt12 * 0.073 - 5940) / p_rbt12
    when p_rbt12 <= 720000 then (p_rbt12 * 0.095 - 13860) / p_rbt12
    when p_rbt12 <= 1800000 then (p_rbt12 * 0.107 - 22500) / p_rbt12
    when p_rbt12 <= 3600000 then (p_rbt12 * 0.143 - 87300) / p_rbt12
    else (p_rbt12 * 0.19 - 378000) / p_rbt12 end
$$;

-- Imposto sobre venda vigente: parâmetro explícito, senão Simples pelo RBT12
-- informado, senão pelo RBT12 calculado com doze meses de vendas.
create or replace function f_imposto_pct(p_unidade uuid, p_competencia date)
returns table (imposto_pct numeric, origem text, rbt12 numeric)
language plpgsql stable as $$
#variable_conflict use_column
declare par parametros%rowtype; calc record;
begin
  select * into par from parametros where unidade_id = p_unidade;
  if par.imposto_pct is not null then
    return query select par.imposto_pct, 'parametro'::text, null::numeric; return;
  end if;
  if par.regime_tributario = 'simples_nacional' then
    if par.rbt12_manual is not null then
      return query select f_aliquota_simples(par.rbt12_manual), 'simples_rbt12_informado'::text, par.rbt12_manual; return;
    end if;
    select * into calc from f_rbt12(p_unidade, p_competencia);
    if calc.meses_com_dado = 12 then
      return query select f_aliquota_simples(calc.rbt12), 'simples_rbt12_calculado'::text, calc.rbt12; return;
    end if;
  end if;
  return query select null::numeric, null::text, null::numeric;
end $$;

-- 5.4 CMV real por base, entre dois inventários gerais fechados.
create or replace function v_cmv_real_base(p_unidade uuid, p_inicio date, p_fim date, p_base base_estoque)
returns table (
  base base_estoque, data_inventario_inicial date, data_inventario_final date,
  estoque_inicial numeric, compras numeric, estoque_final numeric, cmv_real_reais numeric,
  receita numeric, origem_receita text, cmv_real_pct numeric, faltas text[]
)
language plpgsql stable as $$
#variable_conflict use_column
declare
  ini record; fim record; ei numeric; ef numeric; comp numeric; rec record; faltas text[] := '{}';
begin
  -- Registros sempre atribuídos, mesmo sem inventário (evita "record is not assigned yet").
  select null::uuid as id, null::date as data into ini;
  select null::uuid as id, null::date as data into fim;
  select null::numeric as receita, null::text as origem into rec;
  select id, data into ini from inventarios where unidade_id = p_unidade and base = p_base and tipo = 'geral' and fechado and data <= p_inicio order by data desc limit 1;
  if ini.id is null then
    faltas := faltas || ('inventário geral fechado de ' || p_base::text || ' até ' || to_char(p_inicio, 'dd/mm/yyyy'));
  else
    select id, data into fim from inventarios where unidade_id = p_unidade and base = p_base and tipo = 'geral' and fechado and data <= p_fim and data > ini.data order by data desc limit 1;
    if fim.id is null then faltas := faltas || ('inventário geral fechado de ' || p_base::text || ' até ' || to_char(p_fim, 'dd/mm/yyyy')); end if;
  end if;
  if ini.id is not null then
    select sum(valor) into ei from inventario_itens where inventario_id = ini.id;
    if ei is null then faltas := faltas || ('itens contados no inventário de ' || p_base::text || ' de ' || to_char(ini.data, 'dd/mm/yyyy')); end if;
  end if;
  if fim.id is not null then
    select sum(valor) into ef from inventario_itens where inventario_id = fim.id;
    if ef is null then faltas := faltas || ('itens contados no inventário de ' || p_base::text || ' de ' || to_char(fim.data, 'dd/mm/yyyy')); end if;
  end if;
  if ini.id is not null and fim.id is not null then
    select coalesce(sum(ci.quantidade * ci.preco_unitario), 0) into comp
    from compra_itens ci join compras c on c.id = ci.compra_id join insumos i on i.id = ci.insumo_id
    where c.unidade_id = p_unidade and i.base = p_base and c.data > ini.data and c.data <= fim.data;
    select * into rec from f_receita_base(p_unidade, ini.data, fim.data, p_base);
    if rec.receita is null then faltas := faltas || ('receita da base ' || p_base::text || ' no período (importação do R3 ou fechamento do dia)'); end if;
  end if;
  return query select p_base, ini.data, fim.data, ei, comp, ef,
    case when ei is not null and ef is not null then ei + comp - ef end,
    rec.receita, rec.origem,
    case when ei is not null and ef is not null and rec.receita > 0 then (ei + comp - ef) / rec.receita end,
    faltas;
end $$;

-- 5.4 Gap de controle por base, mesma base e mesmo período, com decomposição.
create or replace function v_gap_controle(p_unidade uuid, p_inicio date, p_fim date)
returns table (
  base base_estoque, periodo_inicio date, periodo_fim date,
  cmv_real_pct numeric, cmv_teorico_pct numeric, gap numeric, alerta boolean, parcial boolean,
  gap_reais numeric, perdas_registradas numeric, cortesias_registradas numeric, nao_explicado numeric, faltas text[]
)
language plpgsql stable as $$
#variable_conflict use_column
declare b base_estoque; r record; teo numeric; rec numeric; perdas numeric; cortesias numeric; f text[];
begin
  foreach b in array array['cozinha','bar']::base_estoque[] loop
    select * into r from v_cmv_real_base(p_unidade, p_inicio, p_fim, b);
    f := r.faltas;
    teo := null; rec := null; perdas := null; cortesias := null;
    if r.data_inventario_inicial is not null and r.data_inventario_final is not null then
      select sum(custo_total), sum(receita_liquida) into teo, rec
      from v_cmv_ponderado_bloco(p_unidade, r.data_inventario_inicial + 1, r.data_inventario_final) x
      where (b = 'cozinha' and x.bloco in ('pizza','entrada','sobremesa')) or (b = 'bar' and x.bloco in ('bar','salao'));
      if teo is null or rec is null or rec = 0 then f := f || ('CMV teórico da base ' || b::text || ' (importação do R3 do período)'); end if;
      select coalesce(sum(p.valor) filter (where p.motivo in ('quebra','vencimento','erro')), 0), coalesce(sum(p.valor) filter (where p.motivo in ('cortesia','degustacao','teste')), 0)
      into perdas, cortesias
      from perdas p left join insumos i on i.id = p.insumo_id left join produtos pr on pr.id = p.produto_id
      where p.unidade_id = p_unidade and p.data > r.data_inventario_inicial and p.data <= r.data_inventario_final
        and coalesce(i.base, case when pr.bloco in ('pizza','entrada','sobremesa') then 'cozinha'::base_estoque else 'bar'::base_estoque end) = b;
    end if;
    return query select b, r.data_inventario_inicial, r.data_inventario_final,
      r.cmv_real_pct,
      case when rec > 0 then teo / rec end,
      case when r.cmv_real_pct is not null and rec > 0 then r.cmv_real_pct - teo / rec end,
      case when r.cmv_real_pct is not null and rec > 0 then r.cmv_real_pct - teo / rec > 0.02 else false end,
      false,
      case when r.cmv_real_reais is not null and teo is not null then r.cmv_real_reais - teo end,
      perdas, cortesias,
      case when r.cmv_real_reais is not null and teo is not null then r.cmv_real_reais - teo - coalesce(perdas, 0) - coalesce(cortesias, 0) end,
      f;
  end loop;
end $$;

-- Consumo teórico de insumos pelas fichas (itens diretos e um nível de produção).
create or replace function f_consumo_teorico_insumos(p_unidade uuid, p_inicio date, p_fim date)
returns table (insumo_id uuid, quantidade_base numeric)
language sql stable as $$
  with vendas as (
    select v.produto_id, v.data, v.qtde from vendas_itens v where v.unidade_id = p_unidade and v.data between p_inicio and p_fim and v.produto_id is not null
  ), itens as (
    select v.qtde, fi.insumo_id, fi.producao_id, fi.quantidade, fi.unidade
    from vendas v cross join lateral (select f_ficha_vigente(v.produto_id, v.data) as fid) f
    join ficha_itens fi on fi.ficha_id = f.fid
  ), diretos as (
    select it.insumo_id, sum(it.qtde * f_para_base(it.quantidade, it.unidade, i.unidade_uso) / coalesce(pp.rendimento, 1)) as q
    from itens it join insumos i on i.id = it.insumo_id
    left join lateral f_preco_insumo(it.insumo_id, p_fim) pp on true
    where it.insumo_id is not null group by it.insumo_id
  ), via_producao as (
    select pi.insumo_id,
      sum(it.qtde * f_para_base(it.quantidade, it.unidade, pr.unidade_rendimento) / pr.rendimento_uso_pct / pr.rendimento_declarado * f_para_base(pi.quantidade, pi.unidade, i.unidade_uso) / coalesce(pp.rendimento, 1)) as q
    from itens it join producoes pr on pr.id = it.producao_id and pr.rendimento_declarado is not null
    join producao_itens pi on pi.producao_id = pr.id and pi.insumo_id is not null
    join insumos i on i.id = pi.insumo_id
    left join lateral f_preco_insumo(pi.insumo_id, p_fim) pp on true
    group by pi.insumo_id
  )
  select insumo_id, sum(q) from (select * from diretos union all select * from via_producao) t group by insumo_id
$$;

-- Gap parcial dos itens classe A pelo inventário rotativo (marcado como parcial).
create or replace function v_gap_parcial_itens_a(p_unidade uuid, p_inicio date, p_fim date)
returns table (
  insumo_id uuid, insumo text, data_inicial date, data_final date, quantidade_inicial numeric, compras numeric, quantidade_final numeric,
  consumo_real numeric, consumo_teorico numeric, diferenca numeric, preco numeric, diferenca_reais numeric, parcial boolean
)
language sql stable as $$
  with invs as (
    select i.id, i.data, i.base from inventarios i where i.unidade_id = p_unidade and i.tipo = 'rotativo' and i.fechado and i.data between p_inicio and p_fim
  ), itens_a as (
    select ins.id, ins.nome, ins.unidade_uso from insumos ins where ins.unidade_id = p_unidade and ins.curva_abc = 'A' and ins.ativo
  ), contagens as (
    select ii.insumo_id, inv.data, ii.quantidade_contada, ii.preco_vigente,
      first_value(inv.data) over (partition by ii.insumo_id order by inv.data) as d_ini,
      first_value(inv.data) over (partition by ii.insumo_id order by inv.data desc) as d_fim
    from inventario_itens ii join invs inv on inv.id = ii.inventario_id join itens_a a on a.id = ii.insumo_id
  ), extremos as (
    select c.insumo_id, min(c.d_ini) as d_ini, max(c.d_fim) as d_fim,
      max(c.quantidade_contada) filter (where c.data = c.d_ini) as q_ini,
      max(c.quantidade_contada) filter (where c.data = c.d_fim) as q_fim,
      max(c.preco_vigente) filter (where c.data = c.d_fim) as preco
    from contagens c group by c.insumo_id having min(c.d_ini) < max(c.d_fim)
  )
  select e.insumo_id, a.nome, e.d_ini, e.d_fim, e.q_ini,
    coalesce((select sum(ci.quantidade * i2.fator_compra_para_uso) from compra_itens ci join compras c on c.id = ci.compra_id join insumos i2 on i2.id = ci.insumo_id where ci.insumo_id = e.insumo_id and c.data > e.d_ini and c.data <= e.d_fim), 0),
    e.q_fim,
    e.q_ini + coalesce((select sum(ci.quantidade * i2.fator_compra_para_uso) from compra_itens ci join compras c on c.id = ci.compra_id join insumos i2 on i2.id = ci.insumo_id where ci.insumo_id = e.insumo_id and c.data > e.d_ini and c.data <= e.d_fim), 0) - e.q_fim,
    coalesce(t.quantidade_base, 0),
    (e.q_ini + coalesce((select sum(ci.quantidade * i2.fator_compra_para_uso) from compra_itens ci join compras c on c.id = ci.compra_id join insumos i2 on i2.id = ci.insumo_id where ci.insumo_id = e.insumo_id and c.data > e.d_ini and c.data <= e.d_fim), 0) - e.q_fim) - coalesce(t.quantidade_base, 0),
    e.preco,
    ((e.q_ini + coalesce((select sum(ci.quantidade * i2.fator_compra_para_uso) from compra_itens ci join compras c on c.id = ci.compra_id join insumos i2 on i2.id = ci.insumo_id where ci.insumo_id = e.insumo_id and c.data > e.d_ini and c.data <= e.d_fim), 0) - e.q_fim) - coalesce(t.quantidade_base, 0)) * coalesce(e.preco, 0),
    true
  from extremos e join itens_a a on a.id = e.insumo_id
  left join f_consumo_teorico_insumos(p_unidade, e.d_ini + 1, e.d_fim) t on t.insumo_id = e.insumo_id
  order by a.nome
$$;

-- 5.6 DRE gerencial vertical da competência, com orçamento.
create or replace function v_dre_vertical(p_unidade uuid, p_competencia date)
returns table (ordem integer, codigo text, linha text, valor numeric, vertical numeric, orcamento numeric, orcamento_vertical numeric, desvio numeric, origem text, falta text)
language plpgsql stable as $$
#variable_conflict use_column
declare
  ini date := date_trunc('month', p_competencia)::date;
  fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  rec record; imp record; par parametros%rowtype;
  receita numeric; impostos numeric; taxas numeric; taxas_origem text; comissoes numeric; cmv numeric; cmv_origem text; cmv_falta text;
  embalagem numeric; folha numeric; folha_origem text; ocupacao numeric; utilidades numeric; operacional numeric; marketing numeric; financeiro numeric; outros_var numeric; outros_fixos numeric;
  pro_labore numeric; depreciacao numeric; rl numeric; mc numeric; fixos numeric; resultado numeric;
  cz record; br record;
  n integer := 0;
begin
  select * into par from parametros where unidade_id = p_unidade;
  select * into rec from f_receita_periodo(p_unidade, ini, fim);
  receita := rec.receita;
  select * into imp from f_imposto_pct(p_unidade, ini);
  impostos := case when receita is not null and imp.imposto_pct is not null then receita * imp.imposto_pct end;
  select sum(d.valor) into taxas from despesas d join plano_contas c on c.id = d.conta_id where d.unidade_id = p_unidade and d.competencia = ini and c.linha_dre = 'taxas_pagamento';
  if taxas is not null then taxas_origem := 'despesas'; elsif receita is not null and par.taxa_pagamento_pct is not null then taxas := receita * par.taxa_pagamento_pct; taxas_origem := 'parametro'; end if;
  select coalesce(sum(d.valor), 0) into comissoes from despesas d join plano_contas c on c.id = d.conta_id where d.unidade_id = p_unidade and d.competencia = ini and c.linha_dre = 'comissoes_marketplace';
  select * into cz from v_cmv_real_base(p_unidade, ini, fim, 'cozinha');
  select * into br from v_cmv_real_base(p_unidade, ini, fim, 'bar');
  if cz.cmv_real_reais is not null or br.cmv_real_reais is not null then
    cmv := coalesce(cz.cmv_real_reais, 0) + coalesce(br.cmv_real_reais, 0); cmv_origem := 'real por estoque';
    if cz.cmv_real_reais is null then cmv_falta := 'CMV real da cozinha: ' || array_to_string(cz.faltas, '; '); end if;
    if br.cmv_real_reais is null then cmv_falta := concat_ws('; ', cmv_falta, 'CMV real do bar: ' || array_to_string(br.faltas, '; ')); end if;
  else
    select sum(custo_total) into cmv from v_cmv_ponderado_bloco(p_unidade, ini, fim);
    if cmv is not null then cmv_origem := 'teórico pelas fichas (inventário não fechado)'; cmv_falta := 'inventário geral fechado de cozinha e bar'; else cmv_falta := 'inventário geral e importação do R3 do mês'; end if;
  end if;
  select coalesce(sum(d.valor), 0) into embalagem from despesas d join plano_contas c on c.id = d.conta_id where d.unidade_id = p_unidade and d.competencia = ini and c.linha_dre = 'embalagem';
  select sum(salario + encargos + beneficios + horas_extras_valor) into folha from folha_mensal where unidade_id = p_unidade and competencia = ini;
  if folha is not null then folha_origem := 'folha_mensal'; else
    select sum(d.valor) into folha from despesas d join plano_contas c on c.id = d.conta_id where d.unidade_id = p_unidade and d.competencia = ini and c.linha_dre = 'folha';
    if folha is not null then folha_origem := 'despesas'; end if;
  end if;
  select coalesce(sum(d.valor) filter (where c.linha_dre = 'ocupacao'), 0), coalesce(sum(d.valor) filter (where c.linha_dre = 'utilidades'), 0),
         coalesce(sum(d.valor) filter (where c.linha_dre = 'operacional'), 0), coalesce(sum(d.valor) filter (where c.linha_dre = 'marketing'), 0),
         coalesce(sum(d.valor) filter (where c.linha_dre = 'financeiro'), 0),
         coalesce(sum(d.valor) filter (where c.natureza = 'variavel' and c.linha_dre not in ('impostos','taxas_pagamento','comissoes_marketplace','cmv','embalagem')), 0),
         coalesce(sum(d.valor) filter (where c.natureza <> 'variavel' and c.linha_dre in ('outros')), 0),
         coalesce(sum(d.valor) filter (where c.linha_dre = 'pro_labore'), 0), coalesce(sum(d.valor) filter (where c.linha_dre = 'depreciacao'), 0)
  into ocupacao, utilidades, operacional, marketing, financeiro, outros_var, outros_fixos, pro_labore, depreciacao
  from despesas d join plano_contas c on c.id = d.conta_id where d.unidade_id = p_unidade and d.competencia = ini;

  rl := receita - coalesce(impostos, 0) - coalesce(taxas, 0) - comissoes;
  mc := rl - coalesce(cmv, 0) - embalagem - outros_var;
  fixos := coalesce(folha, 0) + ocupacao + utilidades + operacional + marketing + financeiro + outros_fixos;
  resultado := mc - fixos;

  return query
    select v.ordem, v.codigo, v.linha, v.valor,
      case when receita > 0 then v.valor / receita end,
      o.valor,
      case when receita > 0 and o.valor is not null then o.valor / receita end,
      case when o.valor is not null then v.valor - o.valor end,
      v.origem, v.falta
    from (values
      (1, 'receita_bruta', 'Receita bruta', receita, 'vendas_dia', case when receita is null then 'fechamento do dia (faturamento) no mês' end),
      (2, 'impostos', 'Impostos (Simples Nacional)', -impostos, imp.origem, case when impostos is null then 'imposto sobre venda: informe o RBT12 ou a alíquota em Parâmetros' end),
      (3, 'taxas_pagamento', 'Taxas de pagamento', -taxas, taxas_origem, case when taxas is null then 'taxa de pagamento em Parâmetros ou despesas de taxas' end),
      (4, 'comissoes_marketplace', 'Comissões de marketplace', -comissoes, 'despesas', null),
      (5, 'receita_liquida', 'Receita líquida', rl, null, null),
      (6, 'cmv', 'CMV', -cmv, cmv_origem, cmv_falta),
      (7, 'embalagem', 'Embalagem', -embalagem, 'despesas', null),
      (8, 'outros_variaveis', 'Outros custos variáveis', -outros_var, 'despesas', null),
      (9, 'margem_contribuicao', 'Margem de contribuição', mc, null, null),
      (10, 'folha', 'Folha com encargos', -folha, folha_origem, case when folha is null then 'folha do mês' end),
      (11, 'ocupacao', 'Ocupação', -ocupacao, 'despesas', null),
      (12, 'utilidades', 'Utilidades', -utilidades, 'despesas', null),
      (13, 'operacional', 'Operacional', -operacional, 'despesas', null),
      (14, 'marketing', 'Marketing', -marketing, 'despesas', null),
      (15, 'financeiro', 'Financeiro', -financeiro, 'despesas', null),
      (16, 'outros_fixos', 'Outros fixos', -outros_fixos, 'despesas', null),
      (17, 'custos_fixos', 'Custos fixos e semifixos', -fixos, null, null),
      (18, 'resultado_operacional', 'Resultado operacional', resultado, null, null),
      (19, 'pro_labore', 'Pró-labore', -pro_labore, 'despesas', null),
      (20, 'depreciacao', 'Depreciação', -depreciacao, 'despesas', null),
      (21, 'resultado_final', 'Resultado após pró-labore e depreciação', resultado - pro_labore - depreciacao, null, null)
    ) as v(ordem, codigo, linha, valor, origem, falta)
    left join lateral (
      select case when v.codigo in ('receita_bruta','receita_liquida','margem_contribuicao','resultado_operacional','resultado_final') then sum(x.valor) else -sum(x.valor) end as valor
      from orcamentos x where x.unidade_id = p_unidade and x.competencia = ini and x.linha_dre = v.codigo
    ) o on true
    order by v.ordem;
end $$;

-- 5.6 Ponto de equilíbrio, dia de virada, margem de segurança e lucro alvo.
create or replace function v_ponto_equilibrio(p_unidade uuid, p_competencia date)
returns table (
  receita numeric, custos_variaveis numeric, custos_fixos numeric, margem_contribuicao numeric, mc_pct numeric,
  ticket_medio numeric, dias_abertos bigint, ponto_equilibrio_reais numeric, ponto_equilibrio_clientes numeric, ponto_equilibrio_por_dia numeric,
  dia_de_virada date, margem_seguranca numeric, lucro_alvo numeric, receita_lucro_alvo numeric, clientes_lucro_alvo numeric, faltas text[]
)
language plpgsql stable as $$
#variable_conflict use_column
declare
  ini date := date_trunc('month', p_competencia)::date;
  fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  rec record; d record; rb numeric; var numeric := 0; fix numeric := 0; mc numeric; pct numeric; pe numeric; tm numeric; dias bigint; alvo numeric; f text[] := '{}'; virada date;
begin
  select * into rec from f_receita_periodo(p_unidade, ini, fim);
  rb := rec.receita;
  for d in select * from v_dre_vertical(p_unidade, p_competencia) loop
    if d.codigo in ('impostos','taxas_pagamento','comissoes_marketplace','cmv','embalagem','outros_variaveis') then var := var + coalesce(-d.valor, 0); end if;
    if d.codigo = 'custos_fixos' then fix := coalesce(-d.valor, 0); end if;
    if d.falta is not null and d.codigo in ('receita_bruta','impostos','cmv','folha') then f := f || d.falta; end if;
  end loop;
  select sum(valor) into alvo from orcamentos where unidade_id = p_unidade and competencia = ini and linha_dre = 'lucro_alvo';
  mc := rb - var; pct := case when rb > 0 then mc / rb end; pe := case when pct > 0 then fix / pct end;
  tm := case when rec.clientes > 0 then rb / rec.clientes end;
  if tm is null then f := f || 'número de clientes no fechamento do dia (ticket médio)'; end if;
  dias := rec.dias_com_venda;
  select data into virada from (select data, sum(faturamento_bruto) over (order by data) as acum from vendas_dia where unidade_id = p_unidade and data between ini and fim) x where pe is not null and acum >= pe order by data limit 1;
  return query select rb, var, fix, mc, pct, tm, dias, pe,
    case when tm > 0 then pe / tm end,
    case when tm > 0 and dias > 0 then pe / tm / dias end,
    virada,
    case when rb > 0 and pe is not null then (rb - pe) / rb end,
    alvo,
    case when alvo is not null and pct > 0 then (fix + alvo) / pct end,
    case when alvo is not null and pct > 0 and tm > 0 then (fix + alvo) / pct / tm end,
    f;
end $$;

-- 5.6 Prime cost.
create or replace function v_prime_cost(p_unidade uuid, p_competencia date)
returns table (receita numeric, cmv numeric, folha numeric, prime_cost_pct numeric, faltas text[])
language sql stable as $$
  select
    max(valor) filter (where codigo = 'receita_bruta'),
    -max(valor) filter (where codigo = 'cmv'),
    -max(valor) filter (where codigo = 'folha'),
    case when max(valor) filter (where codigo = 'receita_bruta') > 0 then (-coalesce(max(valor) filter (where codigo = 'cmv'), 0) - coalesce(max(valor) filter (where codigo = 'folha'), 0)) / max(valor) filter (where codigo = 'receita_bruta') end,
    coalesce(array_agg(falta) filter (where falta is not null and codigo in ('receita_bruta','cmv','folha')), '{}')
  from v_dre_vertical(p_unidade, p_competencia)
$$;

-- 5.5 Aderência ao cronograma por dia.
create or replace function v_aderencia_cronograma(p_unidade uuid, p_inicio date, p_fim date)
returns table (data date, etapas bigint, conferidas_na_janela bigint, aderencia numeric, atrasadas text[])
language sql stable as $$
  select data, count(*), count(*) filter (where conferido_em is not null and conferido_em <= hora_fim),
    count(*) filter (where conferido_em is not null and conferido_em <= hora_fim)::numeric / count(*),
    coalesce(array_agg(etapa order by hora_inicio) filter (where conferido_em is null or conferido_em > hora_fim), '{}')
  from cronograma_etapas where unidade_id = p_unidade and data between p_inicio and p_fim
  group by data order by data
$$;

-- 5.5 Desvio de rendimento por batelada.
create or replace function v_desvio_rendimento(p_unidade uuid, p_inicio date, p_fim date)
returns table (batelada_id uuid, data date, producao_id uuid, producao text, rendimento_real numeric, rendimento_declarado numeric, desvio numeric, alerta boolean)
language sql stable as $$
  select b.id, b.data, b.producao_id, p.nome, b.rendimento_real, b.rendimento_declarado_snapshot,
    (b.rendimento_real - b.rendimento_declarado_snapshot) / b.rendimento_declarado_snapshot,
    abs((b.rendimento_real - b.rendimento_declarado_snapshot) / b.rendimento_declarado_snapshot) > 0.03
  from bateladas b join producoes p on p.id = b.producao_id
  where b.unidade_id = p_unidade and b.data between p_inicio and p_fim
  order by b.data desc
$$;

-- 5.5 Sobra e refugo por item, com sequência de dias acima de 5%.
create or replace function v_sobra(p_unidade uuid, p_inicio date, p_fim date)
returns table (item_id uuid, item text, tipo text, dias bigint, produzido numeric, sobra numeric, sobra_pct numeric, refugo_pct numeric, dias_seguidos_acima integer, alerta boolean)
language sql stable as $$
  with base as (
    select coalesce(pd.producao_id, pd.produto_id) as item_id, coalesce(pr.nome, p.nome) as item, case when pd.producao_id is not null then 'producao' else 'produto' end as tipo,
      pd.data, pd.produzido, pd.sobra, pd.refeitos,
      case when pd.produzido > 0 and pd.sobra / pd.produzido > 0.05 then 1 else 0 end as acima
    from producao_diaria pd left join producoes pr on pr.id = pd.producao_id left join produtos p on p.id = pd.produto_id
    where pd.unidade_id = p_unidade and pd.data between p_inicio and p_fim and pd.produzido is not null
  ), grupos as (
    select *, sum(case when acima = 0 then 1 else 0 end) over (partition by item_id order by data) as g from base
  ), sequencias as (
    select item_id, max(cnt) as maior from (select item_id, g, sum(acima) as cnt from grupos group by item_id, g) s group by item_id
  )
  select b.item_id, b.item, b.tipo, count(*), sum(b.produzido), sum(b.sobra),
    case when sum(b.produzido) > 0 then sum(b.sobra) / sum(b.produzido) end,
    case when sum(b.produzido) > 0 then sum(b.refeitos) / sum(b.produzido) end,
    coalesce(s.maior, 0)::integer, coalesce(s.maior, 0) >= 3
  from base b left join sequencias s on s.item_id = b.item_id
  group by b.item_id, b.item, b.tipo, s.maior order by b.item
$$;

-- 5.8 Attach por categoria e tempo à mesa.
create or replace function v_attach(p_unidade uuid, p_inicio date, p_fim date)
returns table (mesas bigint, attach_entrada numeric, attach_sobremesa numeric, attach_bebida numeric, tempo_medio_mesa_min numeric, mesas_sem_detalhe bigint)
language sql stable as $$
  select count(*),
    count(*) filter (where teve_entrada)::numeric / nullif(count(*) filter (where teve_entrada is not null), 0),
    count(*) filter (where teve_sobremesa)::numeric / nullif(count(*) filter (where teve_sobremesa is not null), 0),
    count(*) filter (where teve_bebida)::numeric / nullif(count(*) filter (where teve_bebida is not null), 0),
    avg(extract(epoch from (saida - chegada)) / 60) filter (where saida is not null and chegada is not null),
    count(*) filter (where teve_entrada is null and teve_sobremesa is null and teve_bebida is null)
  from atendimentos where unidade_id = p_unidade and data between p_inicio and p_fim
$$;

-- 5.8 Giro por cadeira e por mesa, ticket médio, por dia.
create or replace function v_giro(p_unidade uuid, p_inicio date, p_fim date)
returns table (data date, receita numeric, clientes integer, ticket_medio numeric, cadeiras integer, giro_por_cadeira numeric, atendimentos bigint, mesas integer, giro_por_mesa numeric)
language sql stable as $$
  select vd.data, vd.faturamento_bruto, vd.clientes,
    case when vd.clientes > 0 then vd.faturamento_bruto / vd.clientes end,
    par.cadeiras, case when par.cadeiras > 0 then vd.clientes::numeric / par.cadeiras end,
    (select count(*) from atendimentos a where a.unidade_id = p_unidade and a.data = vd.data),
    par.mesas, case when par.mesas > 0 then (select count(*) from atendimentos a where a.unidade_id = p_unidade and a.data = vd.data)::numeric / par.mesas end
  from vendas_dia vd left join parametros par on par.unidade_id = vd.unidade_id
  where vd.unidade_id = p_unidade and vd.data between p_inicio and p_fim order by vd.data
$$;

-- 5.7 Turnover nas duas fórmulas e tempo médio de casa.
create or replace function v_turnover(p_unidade uuid, p_inicio date, p_fim date)
returns table (admissoes bigint, desligamentos bigint, efetivo_inicio bigint, efetivo_fim bigint, efetivo_medio numeric, turnover_dieese numeric, turnover_interno numeric, tempo_medio_casa_meses numeric)
language sql stable as $$
  with c as (select * from colaboradores where unidade_id = p_unidade),
  a as (select count(*) as n from c where admissao between p_inicio and p_fim),
  d as (select count(*) as n from c where desligamento between p_inicio and p_fim),
  ei as (select count(*) as n from c where admissao < p_inicio and (desligamento is null or desligamento >= p_inicio)),
  ef as (select count(*) as n from c where admissao <= p_fim and (desligamento is null or desligamento > p_fim))
  select a.n, d.n, ei.n, ef.n, (ei.n + ef.n) / 2.0,
    case when (ei.n + ef.n) > 0 then least(a.n, d.n) / ((ei.n + ef.n) / 2.0) end,
    case when (ei.n + ef.n) > 0 then ((a.n + d.n) / 2.0) / ((ei.n + ef.n) / 2.0) end,
    (select avg((coalesce(desligamento, p_fim) - admissao) / 30.4375) from c where admissao <= p_fim)
  from a, d, ei, ef
$$;

-- 5.7 Horas trabalhadas, extras e absenteísmo do período.
create or replace function v_horas_equipe(p_unidade uuid, p_inicio date, p_fim date)
returns table (dias_escalados bigint, faltas_nao_programadas bigint, absenteismo numeric, horas_previstas numeric, horas_trabalhadas numeric, horas_extras numeric)
language sql stable as $$
  select count(*), count(*) filter (where falta_nao_programada),
    count(*) filter (where falta_nao_programada)::numeric / nullif(count(*), 0),
    sum(extract(epoch from (saida - entrada)) / 3600),
    sum(extract(epoch from (realizado_saida - realizado_entrada)) / 3600) filter (where realizado_saida is not null),
    sum(greatest(0, extract(epoch from (realizado_saida - realizado_entrada)) / 3600 - extract(epoch from (saida - entrada)) / 3600)) filter (where realizado_saida is not null)
  from escalas where unidade_id = p_unidade and data between p_inicio and p_fim
$$;

-- 5.9 Margem por canal para um produto, com os parâmetros vigentes.
create or replace function v_margem_canal(p_unidade uuid, p_produto uuid, p_data date)
returns table (canal_id uuid, canal text, tipo tipo_canal, entrega_por entrega_por, comissao_pct numeric, taxa_pagamento_pct numeric, embalagem numeric, entrega numeric, preco numeric, custo numeric, margem numeric, indice numeric, preco_equivalencia numeric, falta text)
language sql stable as $$
  with base as (
    select f_preco_venda(p_produto, p_data) as preco, (select custo from f_custo_produto(p_produto, p_data)) as custo
  ), canais_p as (
    select c.id, c.nome, c.tipo, c.entrega_por, c.ordem, cp.comissao_pct, cp.taxa_pagamento_pct, cp.embalagem, cp.entrega
    from canais c
    left join lateral (select * from canal_parametros x where x.canal_id = c.id and x.vigencia_inicio <= p_data and (x.vigencia_fim is null or x.vigencia_fim > p_data) order by x.vigencia_inicio desc limit 1) cp on true
    where c.unidade_id = p_unidade and c.ativo
  ), calc as (
    select cp.*, b.preco, b.custo,
      case when cp.comissao_pct is not null and cp.taxa_pagamento_pct is not null and b.preco is not null and b.custo is not null
        then b.preco - b.preco * cp.comissao_pct - b.preco * cp.taxa_pagamento_pct - cp.embalagem - cp.entrega - b.custo end as margem
    from canais_p cp cross join base b
  ), salao as (select margem from calc where tipo = 'salao' order by ordem limit 1)
  select c.id, c.nome, c.tipo, c.entrega_por, c.comissao_pct, c.taxa_pagamento_pct, c.embalagem, c.entrega, c.preco, c.custo, c.margem,
    case when s.margem > 0 then c.margem / s.margem end,
    case when c.comissao_pct is not null and c.taxa_pagamento_pct is not null and s.margem is not null and (1 - c.comissao_pct - c.taxa_pagamento_pct) > 0 then (s.margem + c.embalagem + c.custo + c.entrega) / (1 - c.comissao_pct - c.taxa_pagamento_pct) end,
    case when c.preco is null then 'preço de venda vigente' when c.custo is null then 'custo do produto' when c.comissao_pct is null or c.taxa_pagamento_pct is null then 'comissão e taxa de pagamento do canal' end
  from calc c cross join salao s order by c.ordem
$$;

-- 5.10 Engenharia de cardápio por bloco, nas duas matrizes.
create or replace function v_engenharia_cardapio(p_unidade uuid, p_inicio date, p_fim date, p_bloco bloco_cardapio, p_matriz matriz_engenharia)
returns table (
  produto_id uuid, nome text, qtde numeric, receita numeric, preco_medio numeric, custo numeric, cmv numeric, margem_contribuicao numeric, margem_90d numeric,
  participacao numeric, popularidade_alta boolean, margem_alta boolean, quadrante text,
  numero_itens bigint, unidades numeric, piso_popularidade_unidades numeric, cmv_ponderado numeric, margem_media_ponderada numeric, fator numeric, falta text
)
language plpgsql stable as $$
#variable_conflict use_column
declare par parametros%rowtype; imp record; fator numeric;
begin
  select * into par from parametros where unidade_id = p_unidade;
  fator := coalesce(par.fator_popularidade, 0.70);
  select * into imp from f_imposto_pct(p_unidade, date_trunc('month', p_fim)::date);
  return query
  with itens as (
    select v.produto_id, p.nome, sum(v.qtde) as qtde, sum(v.total) as receita,
      sum(v.custo * v.qtde) as custo_total, count(*) filter (where v.custo is null) as sem_custo
    from (select vi.*, c.custo from vendas_itens vi left join lateral f_custo_produto(vi.produto_id, vi.data) c on true where vi.unidade_id = p_unidade and vi.data between p_inicio and p_fim and vi.produto_id is not null) v
    join produtos p on p.id = v.produto_id and p.bloco = p_bloco
    group by v.produto_id, p.nome
  ), calc as (
    select i.*, case when i.qtde > 0 then i.receita / i.qtde end as preco_medio,
      case when i.qtde > 0 and i.sem_custo = 0 then i.custo_total / i.qtde end as custo_unit,
      case when i.qtde > 0 and i.sem_custo = 0 and imp.imposto_pct is not null and par.taxa_pagamento_pct is not null then (i.receita / i.qtde) - (i.custo_total / i.qtde) - (i.receita / i.qtde) * (imp.imposto_pct + par.taxa_pagamento_pct) end as mc
    from itens i
  ), tot as (
    select count(*) as n, sum(qtde) as un, sum(custo_total) filter (where sem_custo = 0) as custo, sum(receita) filter (where sem_custo = 0) as rec, sum(mc * qtde) as mc_total, sum(qtde) filter (where mc is not null) as un_mc from calc
  )
  select c.produto_id, c.nome, c.qtde, c.receita, c.preco_medio, c.custo_unit,
    case when c.preco_medio > 0 then c.custo_unit / c.preco_medio end,
    c.mc, c.mc * c.qtde,
    case when t.un > 0 then c.qtde / t.un end,
    case when t.un > 0 then c.qtde / t.un >= fator * (1.0 / t.n) - 1e-12 end,
    case when p_matriz = 'miller' then (case when c.custo_unit is not null and t.rec > 0 and c.preco_medio > 0 then c.custo_unit / c.preco_medio <= t.custo / t.rec end)
         else (case when c.mc is not null and t.un_mc > 0 then c.mc >= t.mc_total / t.un_mc end) end,
    case
      when (case when p_matriz = 'miller' then c.custo_unit is null else c.mc is null end) then null
      when (c.qtde / t.un >= fator * (1.0 / t.n) - 1e-12) and (case when p_matriz = 'miller' then c.custo_unit / c.preco_medio <= t.custo / t.rec else c.mc >= t.mc_total / t.un_mc end) then 'estrela'
      when (c.qtde / t.un >= fator * (1.0 / t.n) - 1e-12) then 'cavalo_de_batalha'
      when (case when p_matriz = 'miller' then c.custo_unit / c.preco_medio <= t.custo / t.rec else c.mc >= t.mc_total / t.un_mc end) then 'quebra_cabeca'
      else 'abacaxi' end,
    t.n, t.un, fator * t.un / t.n,
    case when t.rec > 0 then t.custo / t.rec end,
    case when t.un_mc > 0 then t.mc_total / t.un_mc end,
    fator,
    case when c.sem_custo > 0 then 'custo do produto em parte do período'
         when p_matriz = 'kasavana_smith' and imp.imposto_pct is null then 'imposto sobre venda em Parâmetros (margem de contribuição)'
         when p_matriz = 'kasavana_smith' and par.taxa_pagamento_pct is null then 'taxa de pagamento em Parâmetros' end
  from calc c cross join tot t
  order by c.qtde desc;
end $$;

-- Gera o cronograma do dia a partir do modelo (sem duplicar).
create or replace function f_gerar_cronograma_dia(p_unidade uuid, p_data date)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into cronograma_etapas (unidade_id, data, etapa, praca, hora_inicio, hora_fim, ordem)
  select p_unidade, p_data, m.etapa, m.praca,
    (p_data::timestamp + m.hora_inicio) at time zone 'America/Sao_Paulo',
    (case when m.hora_fim < m.hora_inicio then p_data + 1 else p_data end)::timestamp + m.hora_fim at time zone 'America/Sao_Paulo',
    m.ordem
  from cronograma_modelo m
  where m.unidade_id = p_unidade and m.ativo and extract(dow from p_data)::integer = any (m.dias_semana)
    and not exists (select 1 from cronograma_etapas e where e.unidade_id = p_unidade and e.data = p_data and e.etapa = m.etapa);
  get diagnostics n = row_count;
  return n;
end $$;

-- Sugestão de produção do dia (5.5): média do mesmo dia da semana nas últimas
-- 8 a 12 semanas × fator sazonal × fator de segurança − saldo do dia anterior.
create or replace function v_producao_sugerida(p_unidade uuid, p_data date, p_fator_sazonal numeric default 1)
returns table (produto_id uuid, nome text, semanas_usadas integer, media numeric, demanda_projetada numeric, saldo_anterior numeric, producao_sugerida numeric, falta text)
language sql stable as $$
  with hist as (
    select v.produto_id, v.data, sum(v.qtde) as qtde from vendas_itens v
    where v.unidade_id = p_unidade and v.produto_id is not null and v.data < p_data and v.data >= p_data - 84 and extract(dow from v.data) = extract(dow from p_data)
    group by v.produto_id, v.data
  ), agg as (
    select produto_id, count(*)::integer as semanas, avg(qtde) as media from hist group by produto_id
  ), par as (select fator_seguranca_padrao as fs from parametros where unidade_id = p_unidade)
  select p.id, p.nome, coalesce(a.semanas, 0), a.media,
    case when a.semanas >= 8 then a.media * p_fator_sazonal end,
    coalesce((select pd.sobra from producao_diaria pd where pd.unidade_id = p_unidade and pd.produto_id = p.id and pd.data < p_data order by pd.data desc limit 1), 0),
    case when a.semanas >= 8 then greatest(0, a.media * p_fator_sazonal * par.fs - coalesce((select pd.sobra from producao_diaria pd where pd.unidade_id = p_unidade and pd.produto_id = p.id and pd.data < p_data order by pd.data desc limit 1), 0)) end,
    case when coalesce(a.semanas, 0) < 8 then 'histórico de 8 semanas do mesmo dia (há ' || coalesce(a.semanas, 0) || ')' end
  from produtos p left join agg a on a.produto_id = p.id cross join par
  where p.unidade_id = p_unidade and p.ativo and p.bloco in ('pizza','entrada','sobremesa')
  order by p.bloco, p.nome
$$;
