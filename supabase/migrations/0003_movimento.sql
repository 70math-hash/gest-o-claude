-- QT GESTÃO · 0003 · Movimento (seção 4.2) e tabelas de apoio das importações.

create table importacoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  tipo tipo_importacao not null,
  arquivo text not null,
  hash text not null,
  periodo_inicio date,
  periodo_fim date,
  linhas integer not null default 0,
  status status_importacao not null default 'pendente',
  avisos jsonb not null default '[]',
  resumo jsonb not null default '{}',
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  -- Hash único: arquivo já importado é bloqueio (seção 8).
  unique (unidade_id, hash)
);

create table importacao_pendencias (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  importacao_id uuid not null references importacoes (id) on delete cascade,
  tipo tipo_pendencia_importacao not null,
  id_altec text,
  nome_altec text,
  categoria_altec text,
  qtde numeric(12,3),
  total numeric(14,2),
  produto_id uuid references produtos (id),
  bloco bloco_cardapio,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table vendas_itens (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  importacao_id uuid references importacoes (id) on delete cascade,
  data date not null,
  id_altec text,
  produto_id uuid references produtos (id),
  categoria_altec text,
  qtde numeric(12,3) not null,
  vl_tabela numeric(12,2),
  desc_prod numeric(12,2) not null default 0,
  desc_global numeric(12,2) not null default 0,
  -- val_bruto é tabela cheia; total é líquido de desconto.
  val_bruto numeric(14,2) not null,
  total numeric(14,2) not null,
  canal_id uuid references canais (id),
  gratuita_2x1 boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_vendas_itens_data on vendas_itens (unidade_id, data);
create index ix_vendas_itens_produto on vendas_itens (produto_id, data);

create table vendas_dia (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  faturamento_bruto numeric(14,2),
  taxa_servico numeric(14,2),
  clientes integer,
  comandas integer,
  por_segmento jsonb not null default '{}',
  pratos_vendidos integer,
  teve_2x1 boolean not null default false,
  ocorrencia text,
  importacao_id uuid references importacoes (id),
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, data)
);

create table vendas_colaborador_dia (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  colaborador_id uuid references colaboradores (id),
  codigo text,
  nome text,
  segmento segmento_venda,
  receita numeric(14,2) not null default 0,
  itens numeric(12,3) not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_vendas_colab_data on vendas_colaborador_dia (unidade_id, data);

create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  mesa text,
  comanda text,
  clientes integer,
  chegada timestamptz,
  saida timestamptz,
  teve_entrada boolean,
  teve_sobremesa boolean,
  teve_bebida boolean,
  garcom_id uuid references colaboradores (id),
  total numeric(14,2),
  importacao_id uuid references importacoes (id) on delete cascade,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_atendimentos_data on atendimentos (unidade_id, data);

create table compras (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  fornecedor_id uuid references fornecedores (id),
  nota_numero text,
  total numeric(14,2),
  conferido_por uuid,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table compra_itens (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  compra_id uuid not null references compras (id) on delete cascade,
  insumo_id uuid not null references insumos (id),
  quantidade numeric(12,4) not null check (quantidade > 0),
  unidade unidade_base not null default 'kg',
  preco_unitario numeric(12,4) not null check (preco_unitario >= 0),
  temperatura_recebimento numeric(5,1),
  validade date,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

-- Recebimento gera preço vigente com origem nota, herdando o rendimento vigente.
create or replace function f_compra_item_gera_preco() returns trigger
language plpgsql as $$
declare
  d date;
  r numeric;
  preco_atual numeric;
begin
  select data into d from compras where id = new.compra_id;
  select rendimento_pct, preco_por_unidade into r, preco_atual from insumo_precos
    where insumo_id = new.insumo_id and vigencia_inicio <= d and (vigencia_fim is null or vigencia_fim > d)
    order by vigencia_inicio desc limit 1;
  if r is null then
    select rendimento_pct into r from insumo_precos where insumo_id = new.insumo_id order by vigencia_inicio desc limit 1;
  end if;
  if r is null then
    raise exception 'insumo sem rendimento cadastrado: informe o rendimento antes de receber (cadastro sem rendimento não salva)';
  end if;
  if preco_atual is distinct from new.preco_unitario or not exists (
    select 1 from insumo_precos where insumo_id = new.insumo_id and vigencia_inicio = d
  ) then
    if not exists (select 1 from insumo_precos where insumo_id = new.insumo_id and vigencia_inicio = d) then
      insert into insumo_precos (unidade_id, insumo_id, preco_por_unidade, rendimento_pct, vigencia_inicio, origem, compra_item_id)
      values (new.unidade_id, new.insumo_id, new.preco_unitario, r, d, 'nota', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger tg_compra_itens_preco after insert on compra_itens for each row execute function f_compra_item_gera_preco();

create table inventarios (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  tipo tipo_inventario not null,
  base base_estoque not null,
  responsavel_id uuid references colaboradores (id),
  fechado boolean not null default false,
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_inventarios_data on inventarios (unidade_id, base, tipo, data);

create table inventario_itens (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  inventario_id uuid not null references inventarios (id) on delete cascade,
  insumo_id uuid not null references insumos (id),
  quantidade_contada numeric(12,4) not null check (quantidade_contada >= 0),
  quantidade_sistema numeric(12,4),
  preco_vigente numeric(12,4),
  valor numeric(14,4) generated always as (quantidade_contada * coalesce(preco_vigente, 0)) stored,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (inventario_id, insumo_id)
);

-- Valor calculado na data: preenche o preço vigente no momento da contagem.
create or replace function f_inventario_item_preco() returns trigger
language plpgsql as $$
declare d date;
begin
  if new.preco_vigente is null then
    select data into d from inventarios where id = new.inventario_id;
    select preco_por_unidade into new.preco_vigente from insumo_precos
      where insumo_id = new.insumo_id and vigencia_inicio <= d and (vigencia_fim is null or vigencia_fim > d)
      order by vigencia_inicio desc limit 1;
  end if;
  return new;
end $$;
create trigger tg_inventario_itens_preco before insert or update on inventario_itens for each row execute function f_inventario_item_preco();

create table perdas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  insumo_id uuid references insumos (id),
  produto_id uuid references produtos (id),
  quantidade numeric(12,4) not null check (quantidade > 0),
  motivo motivo_perda not null,
  responsavel_id uuid references colaboradores (id),
  valor numeric(14,2),
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check ((insumo_id is null) <> (produto_id is null))
);
create index ix_perdas_data on perdas (unidade_id, data);

create table producao_diaria (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  producao_id uuid references producoes (id),
  produto_id uuid references produtos (id),
  planejado numeric(12,3),
  produzido numeric(12,3),
  sobra numeric(12,3),
  refeitos numeric(12,3) not null default 0,
  responsavel_id uuid references colaboradores (id),
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check ((producao_id is null) <> (produto_id is null)),
  check (sobra is null or produzido is null or sobra <= produzido)
);
create index ix_producao_diaria_data on producao_diaria (unidade_id, data);

create table bateladas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  producao_id uuid not null references producoes (id),
  rendimento_real numeric(12,4) not null check (rendimento_real > 0),
  rendimento_declarado_snapshot numeric(12,4),
  responsavel_id uuid references colaboradores (id),
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create or replace function f_batelada_snapshot() returns trigger
language plpgsql as $$
begin
  if new.rendimento_declarado_snapshot is null then
    select rendimento_declarado into new.rendimento_declarado_snapshot from producoes where id = new.producao_id;
  end if;
  if new.rendimento_declarado_snapshot is null then
    raise exception 'produção sem rendimento declarado: cadastre o rendimento antes de lançar batelada';
  end if;
  return new;
end $$;
create trigger tg_bateladas_snapshot before insert on bateladas for each row execute function f_batelada_snapshot();

create table cronograma_etapas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  etapa text not null,
  praca text,
  hora_inicio timestamptz not null,
  hora_fim timestamptz not null,
  responsavel_id uuid references colaboradores (id),
  conferido_em timestamptz,
  conferido_por uuid,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check (hora_fim >= hora_inicio)
);
create index ix_cronograma_data on cronograma_etapas (unidade_id, data);

create table checklists (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  praca text not null,
  tipo tipo_checklist not null,
  itens_json jsonb not null default '[]',
  assinado_por uuid,
  assinado_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, data, praca, tipo)
);

create table escalas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  colaborador_id uuid not null references colaboradores (id),
  entrada timestamptz not null,
  saida timestamptz not null,
  realizado_entrada timestamptz,
  realizado_saida timestamptz,
  falta_nao_programada boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, data),
  check (saida > entrada)
);
create index ix_escalas_data on escalas (unidade_id, data);

create table folha_mensal (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  competencia date not null,
  colaborador_id uuid not null references colaboradores (id),
  salario numeric(12,2) not null default 0,
  encargos numeric(12,2) not null default 0,
  beneficios numeric(12,2) not null default 0,
  horas_extras_valor numeric(12,2) not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, competencia)
);

create table despesas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  competencia date not null,
  data_caixa date,
  conta_id uuid references plano_contas (id),
  valor numeric(14,2) not null,
  descricao text not null,
  descricao_chave text,
  origem origem_despesa not null default 'manual',
  importacao_id uuid references importacoes (id) on delete cascade,
  confirmada boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_despesas_competencia on despesas (unidade_id, competencia);

-- Regra de classificação aprendida das confirmações anteriores (seção 6.3).
create table classificacao_regras (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  descricao_chave text not null,
  conta_id uuid not null references plano_contas (id),
  vezes integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, descricao_chave)
);

create table conciliacao_dia (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  vendas_sistema numeric(14,2),
  recebido_adquirente numeric(14,2),
  recebido_marketplace numeric(14,2),
  recebido_pix_dinheiro numeric(14,2),
  divergencia numeric(14,2) generated always as (coalesce(vendas_sistema, 0) - coalesce(recebido_adquirente, 0) - coalesce(recebido_marketplace, 0) - coalesce(recebido_pix_dinheiro, 0)) stored,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, data)
);

create table reservas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  hora time not null,
  mesa text,
  pessoas integer not null check (pessoas > 0),
  nome text,
  telefone text,
  cliente_id uuid references clientes (id),
  status status_reserva not null default 'confirmada',
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);
create index ix_reservas_data on reservas (unidade_id, data);

create table caixa_projecao (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  semana_inicio date not null,
  entradas_previstas numeric(14,2) not null default 0,
  saidas_previstas numeric(14,2) not null default 0,
  saldo_inicial numeric(14,2),
  saldo_projetado numeric(14,2),
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, semana_inicio)
);

-- Capacidade do forno medida (seção 5.8): quatro faixas de 15 minutos.
create table forno_medicoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  hora_inicio time not null,
  faixa_1 integer not null check (faixa_1 >= 0),
  faixa_2 integer not null check (faixa_2 >= 0),
  faixa_3 integer not null check (faixa_3 >= 0),
  faixa_4 integer not null check (faixa_4 >= 0),
  pizzas_hora integer generated always as (faixa_1 + faixa_2 + faixa_3 + faixa_4) stored,
  pico_15min integer generated always as (greatest(faixa_1, faixa_2, faixa_3, faixa_4)) stored,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

-- Histórico de decisões de engenharia de cardápio (seção 5.10).
create table decisoes_engenharia (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null default current_date,
  bloco bloco_cardapio not null,
  matriz matriz_engenharia not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  fator_popularidade numeric(5,3) not null,
  resultado jsonb not null,
  decisao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['importacoes','importacao_pendencias','vendas_itens','vendas_dia','vendas_colaborador_dia','atendimentos','compras','compra_itens','inventarios','inventario_itens','perdas','producao_diaria','bateladas','cronograma_etapas','checklists','escalas','folha_mensal','despesas','classificacao_regras','conciliacao_dia','reservas','caixa_projecao','forno_medicoes','decisoes_engenharia'] loop
    execute format('create trigger tg_%s_atualizado before update on %I for each row execute function f_marcar_atualizado_em()', t, t);
  end loop;
end $$;
