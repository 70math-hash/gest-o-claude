-- QT GESTÃO · 0005 · Funções de custo (seção 5.1 a 5.3) espelhando src/motor.
-- Todas recebem unidade e data/período; percentuais como fração.

-- Conversão da unidade da ficha para a unidade base do insumo. Null se incompatível.
create or replace function f_para_base(qtd numeric, un unidade_ficha, base unidade_base) returns numeric
language sql immutable as $$
  select case
    when base = 'kg' and un = 'g' then qtd / 1000
    when base = 'kg' and un = 'kg' then qtd
    when base = 'l' and un = 'ml' then qtd / 1000
    when base = 'l' and un = 'l' then qtd
    when base = 'un' and un = 'un' then qtd
    else null end
$$;

-- Preço e rendimento vigentes de um insumo na data.
create or replace function f_preco_insumo(p_insumo uuid, p_data date)
returns table (preco numeric, rendimento numeric, origem origem_preco, vigencia_inicio date)
language sql stable as $$
  select preco_por_unidade, rendimento_pct, origem, vigencia_inicio
  from insumo_precos
  where insumo_id = p_insumo and vigencia_inicio <= p_data and (vigencia_fim is null or vigencia_fim > p_data)
  order by vigencia_inicio desc limit 1
$$;

-- Custo vigente de uma produção por unidade de rendimento na data.
create or replace function f_custo_producao(p_producao uuid, p_data date)
returns table (custo numeric, custo_altec numeric, origem origem_custo_producao, rendimento_uso numeric)
language sql stable as $$
  select c.custo_por_unidade, coalesce(c.custo_altec_por_unidade, c.custo_por_unidade), c.origem, p.rendimento_uso_pct
  from producao_custos c join producoes p on p.id = c.producao_id
  where c.producao_id = p_producao and c.vigencia_inicio <= p_data and (c.vigencia_fim is null or c.vigencia_fim > p_data)
  order by c.vigencia_inicio desc limit 1
$$;

-- Preço de venda vigente na data.
create or replace function f_preco_venda(p_produto uuid, p_data date) returns numeric
language sql stable as $$
  select preco from produto_precos
  where produto_id = p_produto and vigencia_inicio <= p_data and (vigencia_fim is null or vigencia_fim > p_data)
  order by vigencia_inicio desc limit 1
$$;

-- Meta e teto vigentes do bloco na data.
create or replace function f_meta_bloco(p_unidade uuid, p_bloco text, p_data date)
returns table (meta_pct numeric, teto_pct numeric)
language sql stable as $$
  select meta_pct, teto_pct from metas_cmv
  where unidade_id = p_unidade and bloco = p_bloco and vigencia_inicio <= p_data and (vigencia_fim is null or vigencia_fim > p_data)
  order by vigencia_inicio desc limit 1
$$;

-- Ficha vigente do produto na data.
create or replace function f_ficha_vigente(p_produto uuid, p_data date) returns uuid
language sql stable as $$
  select id from fichas
  where produto_id = p_produto and vigencia_inicio <= p_data and (vigencia_fim is null or vigencia_fim > p_data)
  order by versao desc limit 1
$$;

-- Itens de uma ficha custeados na data (insumos com rendimento; produções com
-- custo vigente e rendimento de uso). "falta" diz o que impede o cálculo.
create or replace function f_custo_ficha_itens(p_ficha uuid, p_data date)
returns table (
  item_id uuid, ordem integer, tipo text, nome text, quantidade numeric, unidade unidade_ficha,
  quantidade_base numeric, unidade_base unidade_base, preco_ou_custo numeric, rendimento numeric,
  custo numeric, custo_altec numeric, distorcao numeric, falta text
)
language sql stable as $$
  select
    fi.id, fi.ordem,
    case when fi.insumo_id is not null then 'insumo' else 'producao' end,
    coalesce(i.nome, p.nome),
    fi.quantidade, fi.unidade,
    f_para_base(fi.quantidade, fi.unidade, coalesce(i.unidade_uso, p.unidade_rendimento)),
    coalesce(i.unidade_uso, p.unidade_rendimento),
    coalesce(pi.preco, pc.custo),
    coalesce(pi.rendimento, pc.rendimento_uso),
    case
      when f_para_base(fi.quantidade, fi.unidade, coalesce(i.unidade_uso, p.unidade_rendimento)) is null then null
      when fi.insumo_id is not null and pi.preco is not null then f_para_base(fi.quantidade, fi.unidade, i.unidade_uso) * pi.preco / pi.rendimento
      when fi.producao_id is not null and pc.custo is not null then f_para_base(fi.quantidade, fi.unidade, p.unidade_rendimento) * pc.custo / pc.rendimento_uso
      else null end,
    case
      when f_para_base(fi.quantidade, fi.unidade, coalesce(i.unidade_uso, p.unidade_rendimento)) is null then null
      when fi.insumo_id is not null and pi.preco is not null then f_para_base(fi.quantidade, fi.unidade, i.unidade_uso) * pi.preco
      when fi.producao_id is not null and pc.custo is not null then f_para_base(fi.quantidade, fi.unidade, p.unidade_rendimento) * pc.custo_altec
      else null end,
    case
      when f_para_base(fi.quantidade, fi.unidade, coalesce(i.unidade_uso, p.unidade_rendimento)) is null then null
      when fi.insumo_id is not null and pi.preco is not null then f_para_base(fi.quantidade, fi.unidade, i.unidade_uso) * pi.preco * (1 / pi.rendimento - 1)
      when fi.producao_id is not null and pc.custo is not null then f_para_base(fi.quantidade, fi.unidade, p.unidade_rendimento) * (pc.custo / pc.rendimento_uso - pc.custo_altec)
      else null end,
    case
      when f_para_base(fi.quantidade, fi.unidade, coalesce(i.unidade_uso, p.unidade_rendimento)) is null then 'unidade da ficha incompatível com a unidade do insumo: ' || coalesce(i.nome, p.nome)
      when fi.insumo_id is not null and pi.preco is null then 'preço vigente do insumo ' || i.nome
      when fi.producao_id is not null and pc.custo is null then 'custo vigente da produção ' || p.nome
      else null end
  from ficha_itens fi
  left join insumos i on i.id = fi.insumo_id
  left join producoes p on p.id = fi.producao_id
  left join lateral f_preco_insumo(fi.insumo_id, p_data) pi on fi.insumo_id is not null
  left join lateral f_custo_producao(fi.producao_id, p_data) pc on fi.producao_id is not null
  where fi.ficha_id = p_ficha
  order by fi.ordem, fi.criado_em
$$;

-- Custo de um produto na data: ficha vigente ou, na falta dela, custo de
-- referência (D-012). Nunca inventa: sem ficha e sem referência, tudo nulo.
create or replace function f_custo_produto(p_produto uuid, p_data date)
returns table (ficha_id uuid, versao integer, custo numeric, custo_altec numeric, origem text, itens_sem_custo integer, faltas text[], insumo_maior_distorcao text)
language plpgsql stable as $$
declare
  fid uuid := f_ficha_vigente(p_produto, p_data);
  ref custos_referencia%rowtype;
begin
  if fid is not null then
    return query
      select fid, f.versao,
        case when count(*) filter (where c.custo is null) > 0 then null else sum(c.custo) end,
        case when count(*) filter (where c.custo_altec is null) > 0 then null else sum(c.custo_altec) end,
        'ficha'::text,
        count(*) filter (where c.custo is null)::integer,
        coalesce(array_agg(c.falta) filter (where c.falta is not null), '{}'),
        (select nome from f_custo_ficha_itens(fid, p_data) x where x.distorcao > 0 order by x.distorcao desc limit 1)
      from f_custo_ficha_itens(fid, p_data) c, fichas f where f.id = fid
      group by f.versao;
    return;
  end if;
  select * into ref from custos_referencia where produto_id = p_produto and data_referencia <= p_data order by data_referencia desc limit 1;
  if found then
    return query select null::uuid, null::integer, ref.custo, coalesce(ref.custo_altec, ref.custo), 'referencia'::text, 0, array['ficha técnica não cadastrada (custo de referência de ' || to_char(ref.data_referencia, 'dd/mm/yyyy') || ')'], null::text;
    return;
  end if;
  return query select null::uuid, null::integer, null::numeric, null::numeric, null::text, 0, array['ficha técnica não cadastrada'], null::text;
end $$;

-- v_custo_ficha_vigente: uma linha por produto ativo da unidade na data.
create or replace function v_custo_ficha_vigente(p_unidade uuid, p_data date)
returns table (
  produto_id uuid, nome text, bloco bloco_cardapio, secao text, ficha_id uuid, versao integer,
  custo numeric, custo_altec numeric, origem text, itens_sem_custo integer, faltas text[], insumo_maior_distorcao text
)
language sql stable as $$
  select p.id, p.nome, p.bloco, s.nome, c.ficha_id, c.versao, c.custo, c.custo_altec, c.origem, c.itens_sem_custo, c.faltas, c.insumo_maior_distorcao
  from produtos p
  left join secoes s on s.id = p.secao_id
  cross join lateral f_custo_produto(p.id, p_data) c
  where p.unidade_id = p_unidade and p.ativo
  order by p.bloco, s.ordem, p.nome
$$;

-- v_cmv_teorico_item: custo, os dois CMV, distorção, precificação e faixa.
create or replace function v_cmv_teorico_item(p_unidade uuid, p_data date)
returns table (
  produto_id uuid, nome text, bloco bloco_cardapio, secao text, preco_venda numeric,
  custo numeric, custo_altec numeric, origem_custo text, faltas text[],
  cmv_teorico numeric, cmv_altec numeric, distorcao numeric, alerta_distorcao boolean, insumo_maior_distorcao text,
  meta_pct numeric, teto_pct numeric, acima_da_meta boolean, critico boolean,
  preco_minimo numeric, preco_sugerido numeric, piso numeric, teto numeric, situacao_faixa text
)
language sql stable as $$
  select
    c.produto_id, c.nome, c.bloco, c.secao, pv.preco,
    c.custo, c.custo_altec, c.origem, c.faltas,
    case when pv.preco > 0 then c.custo / pv.preco end,
    case when pv.preco > 0 then c.custo_altec / pv.preco end,
    case when pv.preco > 0 then (c.custo - c.custo_altec) / pv.preco end,
    case when pv.preco > 0 then (c.custo - c.custo_altec) / pv.preco > 0.03 else false end,
    c.insumo_maior_distorcao,
    m.meta_pct, m.teto_pct,
    case when pv.preco > 0 and m.meta_pct is not null then c.custo / pv.preco > m.meta_pct else false end,
    case when pv.preco > 0 and c.bloco = 'entrada' then c.custo / pv.preco > 0.33 else false end,
    case when m.meta_pct > 0 then c.custo / m.meta_pct end,
    case when m.meta_pct > 0 then ceil((c.custo / m.meta_pct) / 5 - 1e-9) * 5 end,
    s.piso, s.teto,
    case when pv.preco is null then null when s.piso is not null and pv.preco < s.piso then 'abaixo_do_piso' when s.teto is not null and pv.preco > s.teto then 'acima_do_teto' else 'dentro' end
  from v_custo_ficha_vigente(p_unidade, p_data) c
  join produtos p on p.id = c.produto_id
  left join secoes s on s.id = p.secao_id
  left join lateral (select f_preco_venda(c.produto_id, p_data) as preco) pv on true
  left join lateral f_meta_bloco(p_unidade, c.bloco::text, p_data) m on true
$$;

-- v_cmv_ponderado_bloco: sobre as vendas importadas do período, com o custo
-- vigente na data de cada venda. Itens sem custo entram na receita e são
-- contados em itens_sem_custo (regra 10: o painel diz o que falta).
create or replace function v_cmv_ponderado_bloco(p_unidade uuid, p_inicio date, p_fim date)
returns table (
  bloco bloco_cardapio, qtde numeric, custo_total numeric, receita_liquida numeric, receita_tabela numeric,
  cmv_operacional numeric, cmv_tabela numeric, meta_pct numeric, teto_pct numeric,
  itens_sem_custo integer, linhas_sem_produto integer, custo_2x1_gratuitas numeric
)
language sql stable as $$
  with vendas as (
    select v.*, p.bloco as bloco_produto, c.custo
    from vendas_itens v
    left join produtos p on p.id = v.produto_id
    left join lateral f_custo_produto(v.produto_id, v.data) c on v.produto_id is not null
    where v.unidade_id = p_unidade and v.data between p_inicio and p_fim
  )
  select
    b.bloco,
    coalesce(sum(v.qtde), 0),
    sum(v.custo * v.qtde) filter (where v.custo is not null),
    coalesce(sum(v.total), 0),
    coalesce(sum(v.val_bruto), 0),
    case when sum(v.total) > 0 then sum(v.custo * v.qtde) filter (where v.custo is not null) / sum(v.total) end,
    case when sum(v.val_bruto) > 0 then sum(v.custo * v.qtde) filter (where v.custo is not null) / sum(v.val_bruto) end,
    m.meta_pct, m.teto_pct,
    count(distinct v.produto_id) filter (where v.custo is null and v.produto_id is not null)::integer,
    count(*) filter (where v.produto_id is null)::integer,
    coalesce(sum(v.custo * v.qtde) filter (where v.gratuita_2x1), 0)
  from (select unnest(enum_range(null::bloco_cardapio)) as bloco) b
  left join vendas v on v.bloco_produto = b.bloco
  left join lateral f_meta_bloco(p_unidade, b.bloco::text, p_fim) m on true
  group by b.bloco, m.meta_pct, m.teto_pct
  order by b.bloco
$$;

-- CMV do dia com 2x1 (seção 5.2): receita bruta das pagas nunca é descontada.
create or replace function v_cmv_dia_2x1(p_unidade uuid, p_data date)
returns table (receita_bruta numeric, custo_pagas numeric, custo_gratuitas numeric, custo_total numeric, cmv numeric, gratuitas_a_confirmar integer)
language sql stable as $$
  with pizzas as (
    select v.*, c.custo from vendas_itens v
    join produtos p on p.id = v.produto_id and p.bloco = 'pizza'
    left join lateral f_custo_produto(v.produto_id, v.data) c on true
    where v.unidade_id = p_unidade and v.data = p_data
  )
  select
    coalesce(sum(total) filter (where not gratuita_2x1), 0),
    coalesce(sum(custo * qtde) filter (where not gratuita_2x1), 0),
    coalesce(sum(custo * qtde) filter (where gratuita_2x1), 0),
    coalesce(sum(custo * qtde), 0),
    case when sum(total) filter (where not gratuita_2x1) > 0 then sum(custo * qtde) / sum(total) filter (where not gratuita_2x1) end,
    (select count(*)::integer from importacao_pendencias ip where ip.unidade_id = p_unidade and ip.tipo = 'gratuita_2x1_a_confirmar' and ip.resolvido_em is null)
  from pizzas
$$;

-- Nova versão de ficha em uma transação: cria a ficha, os itens e fecha.
-- Itens: [{"insumo_id": uuid | null, "producao_id": uuid | null, "quantidade": n, "unidade": "g"}]
create or replace function f_nova_versao_ficha(p_produto uuid, p_motivo text, p_itens jsonb, p_vigencia date default current_date, p_foto_url text default null)
returns uuid language plpgsql security invoker as $$
declare
  nova uuid;
  v integer;
  item jsonb;
  qtd numeric;
  un unidade_ficha;
  qtd_kg numeric;
  ordem integer := 0;
begin
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'ficha alterada sem motivo e sem versão nova: bloqueado';
  end if;
  if jsonb_array_length(coalesce(p_itens, '[]')) = 0 then
    raise exception 'ficha sem itens';
  end if;
  select coalesce(max(versao), 0) + 1 into v from fichas where produto_id = p_produto;
  insert into fichas (produto_id, versao, vigencia_inicio, motivo, aprovado_por, foto_url, unidade_id)
  values (p_produto, v, p_vigencia, p_motivo, auth.uid(), p_foto_url, (select unidade_id from produtos where id = p_produto))
  returning id into nova;
  for item in select * from jsonb_array_elements(p_itens) loop
    qtd := (item->>'quantidade')::numeric;
    un := (item->>'unidade')::unidade_ficha;
    if item->>'producao_id' is not null and not exists (select 1 from producoes where id = (item->>'producao_id')::uuid and (rendimento_declarado is not null or exists (select 1 from producao_custos pc where pc.producao_id = (item->>'producao_id')::uuid))) then
      raise exception 'produção intermediária sem rendimento declarado: cadastro bloqueado';
    end if;
    insert into ficha_itens (ficha_id, insumo_id, producao_id, quantidade, unidade, ordem, unidade_id)
    values (nova, nullif(item->>'insumo_id', '')::uuid, nullif(item->>'producao_id', '')::uuid, qtd, un, ordem, (select unidade_id from produtos where id = p_produto));
    ordem := ordem + 1;
  end loop;
  update fichas set fechada = true where id = nova;
  return nova;
end $$;

-- Recalcula o custo de uma produção a partir da batelada cadastrada e grava
-- a vigência calculada. Bloqueia sem rendimento.
create or replace function f_recalcular_custo_producao(p_producao uuid, p_data date default current_date)
returns numeric language plpgsql as $$
declare
  r numeric;
  total numeric := 0;
  total_altec numeric := 0;
  item record;
  unid uuid;
begin
  select rendimento_declarado, unidade_id into r, unid from producoes where id = p_producao;
  if r is null or r <= 0 then
    raise exception 'produção intermediária sem rendimento declarado: cadastro bloqueado';
  end if;
  if not exists (select 1 from producao_itens where producao_id = p_producao) then
    raise exception 'produção sem itens de batelada cadastrados';
  end if;
  for item in
    select pi.*, i.unidade_uso, pr.unidade_rendimento, pp.preco, pp.rendimento, pc.custo, pc.custo_altec, pc.rendimento_uso
    from producao_itens pi
    left join insumos i on i.id = pi.insumo_id
    left join producoes pr on pr.id = pi.producao_filha_id
    left join lateral f_preco_insumo(pi.insumo_id, p_data) pp on pi.insumo_id is not null
    left join lateral f_custo_producao(pi.producao_filha_id, p_data) pc on pi.producao_filha_id is not null
    where pi.producao_id = p_producao
  loop
    if item.insumo_id is not null then
      if item.preco is null then raise exception 'insumo sem preço vigente na batelada'; end if;
      total := total + f_para_base(item.quantidade, item.unidade, item.unidade_uso) * item.preco / item.rendimento;
      total_altec := total_altec + f_para_base(item.quantidade, item.unidade, item.unidade_uso) * item.preco;
    else
      if item.custo is null then raise exception 'produção filha sem custo vigente'; end if;
      total := total + f_para_base(item.quantidade, item.unidade, item.unidade_rendimento) * item.custo / item.rendimento_uso;
      total_altec := total_altec + f_para_base(item.quantidade, item.unidade, item.unidade_rendimento) * item.custo_altec;
    end if;
  end loop;
  insert into producao_custos (unidade_id, producao_id, custo_por_unidade, custo_batelada, custo_altec_por_unidade, origem, vigencia_inicio)
  values (unid, p_producao, total / r, total, total_altec / r, 'calculado', p_data);
  return total / r;
end $$;

-- Curva ABC semestral pelo valor comprado (A = 80% do valor, B = 15%, C = resto).
create or replace function f_recalcular_curva_abc(p_unidade uuid, p_inicio date, p_fim date)
returns integer language plpgsql as $$
declare n integer;
begin
  with valores as (
    select ci.insumo_id, sum(ci.quantidade * ci.preco_unitario) as valor
    from compra_itens ci join compras c on c.id = ci.compra_id
    where c.unidade_id = p_unidade and c.data between p_inicio and p_fim
    group by ci.insumo_id
  ), acumulado as (
    select insumo_id, valor, sum(valor) over (order by valor desc) / nullif(sum(valor) over (), 0) as acum from valores
  ), classes as (
    select insumo_id, case when acum <= 0.80 then 'A' when acum <= 0.95 then 'B' else 'C' end::curva_abc as classe from acumulado
  )
  update insumos i set curva_abc = c.classe from classes c where c.insumo_id = i.id;
  get diagnostics n = row_count;
  return n;
end $$;
