-- QT GESTÃO · 0002 · Cadastro (seção 4.1) mais as tabelas de apoio das
-- decisões D-006 (parâmetros), D-010 (rendimento de uso), D-011 (custo de
-- produção temporal), D-012 (custo de referência) e D-013 (canais).

-- Macro para colunas padrão: usada por texto nas tabelas abaixo.
-- id, unidade_id, criado_em, criado_por, atualizado_em.

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  cnpj text,
  contato text,
  prazo_entrega_dias integer not null default 1 check (prazo_entrega_dias >= 0),
  homologado boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table insumos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  categoria text,
  base base_estoque not null default 'cozinha',
  codigo_altec text,
  unidade_compra text not null default 'kg',
  unidade_uso unidade_base not null default 'kg',
  fator_compra_para_uso numeric(12,4) not null default 1 check (fator_compra_para_uso > 0),
  curva_abc curva_abc,
  fornecedor_padrao_id uuid references fornecedores (id),
  ativo boolean not null default true,
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome)
);

-- Preço e rendimento temporais: nunca sobrescreve (regra 4).
create table insumo_precos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  insumo_id uuid not null references insumos (id) on delete cascade,
  preco_por_unidade numeric(12,4) not null check (preco_por_unidade >= 0),
  rendimento_pct numeric(6,4) not null check (rendimento_pct > 0 and rendimento_pct <= 1),
  vigencia_inicio date not null,
  vigencia_fim date,
  origem origem_preco not null default 'manual',
  compra_item_id uuid,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim > vigencia_inicio),
  exclude using gist (insumo_id with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);
create index ix_insumo_precos_vigencia on insumo_precos (insumo_id, vigencia_inicio desc);

-- Fecha a vigência anterior ao inserir preço novo; proíbe alterar preço ou
-- rendimento de uma vigência existente (só a data de fim pode ser fechada).
create or replace function f_insumo_preco_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update insumo_precos set vigencia_fim = new.vigencia_inicio
    where insumo_id = new.insumo_id and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
    if exists (select 1 from insumo_precos where insumo_id = new.insumo_id and id <> new.id and vigencia_inicio >= new.vigencia_inicio and vigencia_fim is null) then
      raise exception 'já existe preço vigente com início igual ou posterior a %; preços não são sobrescritos', new.vigencia_inicio;
    end if;
    return new;
  end if;
  if new.preco_por_unidade <> old.preco_por_unidade or new.rendimento_pct <> old.rendimento_pct or new.vigencia_inicio <> old.vigencia_inicio or new.origem <> old.origem then
    raise exception 'preço de insumo é temporal: crie uma vigência nova em vez de alterar';
  end if;
  return new;
end $$;
create trigger tg_insumo_precos_temporal before insert or update on insumo_precos for each row execute function f_insumo_preco_temporal();

create table insumo_fornecedores (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  insumo_id uuid not null references insumos (id) on delete cascade,
  fornecedor_id uuid not null references fornecedores (id) on delete cascade,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (insumo_id, fornecedor_id)
);

create table producoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  codigo_altec text,
  nome text not null,
  base base_estoque not null default 'cozinha',
  unidade_rendimento unidade_base not null default 'kg',
  -- Nulo só para produções importadas do Altec com custo declarado e batelada
  -- ainda não pesada (D-011). Cadastrar a batelada exige rendimento.
  rendimento_declarado numeric(12,4) check (rendimento_declarado is null or rendimento_declarado > 0),
  -- Rendimento de uso da produção dentro de um prato (D-010). Padrão 100%.
  rendimento_uso_pct numeric(6,4) not null default 1 check (rendimento_uso_pct > 0 and rendimento_uso_pct <= 1),
  ativo boolean not null default true,
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome)
);

create table producao_itens (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  producao_id uuid not null references producoes (id) on delete cascade,
  insumo_id uuid references insumos (id),
  producao_filha_id uuid references producoes (id),
  quantidade numeric(12,4) not null check (quantidade > 0),
  unidade unidade_ficha not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check ((insumo_id is null) <> (producao_filha_id is null)),
  check (producao_filha_id is null or producao_filha_id <> producao_id)
);

-- Bloqueio da seção 8: batelada (itens) só existe com rendimento declarado.
create or replace function f_producao_exige_rendimento() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from producoes where id = new.producao_id and rendimento_declarado is not null) then
    raise exception 'produção intermediária sem rendimento declarado: cadastro bloqueado';
  end if;
  return new;
end $$;
create trigger tg_producao_itens_rendimento before insert or update on producao_itens for each row execute function f_producao_exige_rendimento();

-- Custo da produção por unidade de rendimento, temporal (D-011).
create table producao_custos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  producao_id uuid not null references producoes (id) on delete cascade,
  custo_por_unidade numeric(12,4) not null check (custo_por_unidade >= 0),
  custo_batelada numeric(12,4),
  custo_altec_por_unidade numeric(12,4),
  origem origem_custo_producao not null default 'manual',
  vigencia_inicio date not null,
  vigencia_fim date,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim > vigencia_inicio),
  exclude using gist (producao_id with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);

create or replace function f_producao_custo_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update producao_custos set vigencia_fim = new.vigencia_inicio
    where producao_id = new.producao_id and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
    return new;
  end if;
  if new.custo_por_unidade <> old.custo_por_unidade or new.vigencia_inicio <> old.vigencia_inicio then
    raise exception 'custo de produção é temporal: crie uma vigência nova em vez de alterar';
  end if;
  return new;
end $$;
create trigger tg_producao_custos_temporal before insert or update on producao_custos for each row execute function f_producao_custo_temporal();

create table secoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  bloco bloco_cardapio not null,
  piso numeric(12,2),
  teto numeric(12,2),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome),
  check (piso is null or teto is null or teto >= piso)
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  id_altec text,
  nome_altec text,
  nome text not null,
  bloco bloco_cardapio not null,
  secao_id uuid references secoes (id),
  ativo boolean not null default true,
  sazonal boolean not null default false,
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome)
);
create unique index ux_produtos_id_altec on produtos (unidade_id, id_altec) where id_altec is not null;
create index ix_produtos_nome_chave on produtos (unidade_id, f_nome_chave(coalesce(nome_altec, nome)));

create table produto_precos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  produto_id uuid not null references produtos (id) on delete cascade,
  preco numeric(12,2) not null check (preco >= 0),
  vigencia_inicio date not null,
  vigencia_fim date,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim > vigencia_inicio),
  exclude using gist (produto_id with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);

create or replace function f_produto_preco_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update produto_precos set vigencia_fim = new.vigencia_inicio
    where produto_id = new.produto_id and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
    return new;
  end if;
  if new.preco <> old.preco or new.vigencia_inicio <> old.vigencia_inicio then
    raise exception 'preço de venda é temporal: crie uma vigência nova em vez de alterar';
  end if;
  return new;
end $$;
create trigger tg_produto_precos_temporal before insert or update on produto_precos for each row execute function f_produto_preco_temporal();

-- Fichas versionadas: alteração gera versão nova, com motivo obrigatório.
create table fichas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  produto_id uuid not null references produtos (id) on delete cascade,
  versao integer not null check (versao > 0),
  vigencia_inicio date not null,
  vigencia_fim date,
  motivo text not null check (length(trim(motivo)) > 0),
  aprovado_por uuid,
  foto_url text,
  fechada boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (produto_id, versao),
  check (vigencia_fim is null or vigencia_fim > vigencia_inicio),
  exclude using gist (produto_id with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);

create or replace function f_ficha_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update fichas set vigencia_fim = new.vigencia_inicio
    where produto_id = new.produto_id and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
    return new;
  end if;
  if old.fechada and (new.motivo <> old.motivo or new.vigencia_inicio <> old.vigencia_inicio or new.versao <> old.versao) then
    raise exception 'ficha fechada não muda: crie uma versão nova com motivo';
  end if;
  return new;
end $$;
create trigger tg_fichas_temporal before insert or update on fichas for each row execute function f_ficha_temporal();

create table ficha_itens (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  ficha_id uuid not null references fichas (id) on delete cascade,
  insumo_id uuid references insumos (id),
  producao_id uuid references producoes (id),
  quantidade numeric(12,4) not null check (quantidade > 0),
  unidade unidade_ficha not null,
  ordem integer not null default 0,
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check ((insumo_id is null) <> (producao_id is null))
);
create index ix_ficha_itens_ficha on ficha_itens (ficha_id);

-- Bloqueio: itens de ficha fechada não mudam (ficha alterada sem versão nova).
create or replace function f_ficha_item_bloqueio() returns trigger
language plpgsql as $$
declare
  fid uuid := coalesce(new.ficha_id, old.ficha_id);
begin
  if exists (select 1 from fichas where id = fid and fechada) then
    raise exception 'ficha alterada sem motivo e sem versão nova: bloqueado';
  end if;
  return coalesce(new, old);
end $$;
create trigger tg_ficha_itens_bloqueio before insert or update or delete on ficha_itens for each row execute function f_ficha_item_bloqueio();

-- Custo de referência quando ainda não há ficha cadastrada (D-012).
create table custos_referencia (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  produto_id uuid not null references produtos (id) on delete cascade,
  custo numeric(12,4) not null check (custo >= 0),
  custo_altec numeric(12,4),
  data_referencia date not null,
  origem text not null default 'especificacao 13.1',
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (produto_id, data_referencia)
);

create table metas_cmv (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  bloco text not null,
  meta_pct numeric(6,4) not null check (meta_pct > 0 and meta_pct < 1),
  teto_pct numeric(6,4) check (teto_pct is null or teto_pct >= meta_pct),
  observacao text,
  vigencia_inicio date not null,
  vigencia_fim date,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  exclude using gist (unidade_id with =, bloco with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);

create or replace function f_meta_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update metas_cmv set vigencia_fim = new.vigencia_inicio
    where unidade_id = new.unidade_id and bloco = new.bloco and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
    return new;
  end if;
  if new.meta_pct <> old.meta_pct or coalesce(new.teto_pct, -1) <> coalesce(old.teto_pct, -1) then
    raise exception 'meta de CMV é temporal: crie uma vigência nova em vez de alterar';
  end if;
  return new;
end $$;
create trigger tg_metas_temporal before insert or update on metas_cmv for each row execute function f_meta_temporal();

create table combos_2x1 (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  produto_gratuito_id uuid not null references produtos (id),
  produto_pago_id uuid not null references produtos (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (produto_gratuito_id, produto_pago_id)
);

create table plano_contas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  codigo text,
  grupo text not null,
  nome text not null,
  natureza natureza_conta not null,
  dono perfil_acesso not null default 'gestor',
  -- Grupo do DRE em que a conta aparece (folha, ocupacao, utilidades, operacional, marketing, cmv, embalagem, impostos, taxas...).
  linha_dre text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, grupo, nome)
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  competencia date not null,
  conta_id uuid references plano_contas (id),
  -- Linhas sem conta: receita_bruta, cmv, folha (orçamento por linha do DRE).
  linha_dre text,
  valor numeric(14,2) not null,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check ((conta_id is null) <> (linha_dre is null))
);

create table parametros (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null unique references unidades (id) default f_unidade_atual(),
  cadeiras integer check (cadeiras is null or cadeiras > 0),
  mesas integer check (mesas is null or mesas > 0),
  horas_servico numeric(5,2),
  -- 0 = domingo ... 6 = sábado. Terça a domingo por padrão.
  dias_operacao integer[] not null default '{0,2,3,4,5,6}',
  taxa_servico_pct numeric(6,4) not null default 0.13,
  fator_seguranca_padrao numeric(5,3) not null default 1.10,
  alerta_documento_dias integer not null default 60,
  fator_popularidade numeric(5,3) not null default 0.70,
  cozinheiros_padrao integer not null default 4,
  -- Tributação (D-008): Simples Nacional, Anexo I. imposto_pct é a alíquota
  -- efetiva; se nulo, o sistema tenta calcular pelo RBT12.
  regime_tributario text not null default 'simples_nacional',
  simples_anexo text not null default 'I',
  rbt12_manual numeric(14,2),
  imposto_pct numeric(6,4),
  taxa_pagamento_pct numeric(6,4),
  -- Capacidade do forno medida (pergunta 7): pizzas por hora cheia de pico e pico de 15 minutos.
  forno_pizzas_hora integer,
  forno_pico_15min integer,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  cargo text not null,
  praca text,
  codigo_altec text,
  admissao date not null,
  desligamento date,
  salario_base numeric(12,2),
  ativo boolean generated always as (desligamento is null) stored,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  check (desligamento is null or desligamento >= admissao)
);

create table processos_criticos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  praca text,
  pop_url text,
  pop_versao text,
  pop_testado_em date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome)
);

create table certificacoes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  colaborador_id uuid not null references colaboradores (id) on delete cascade,
  processo_id uuid not null references processos_criticos (id) on delete cascade,
  nivel integer not null check (nivel between 1 and 4),
  data date not null,
  avaliador_id uuid references colaboradores (id),
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table documentos_risco (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  tipo text not null,
  vencimento date not null,
  responsavel_id uuid references colaboradores (id),
  alerta_dias integer not null default 60,
  arquivo_url text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  telefone text,
  primeira_visita date,
  ultima_visita date,
  visitas integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

-- Canais (seção 5.9, D-013): parâmetros editáveis e temporais.
create table canais (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  nome text not null,
  tipo tipo_canal not null,
  entrega_por entrega_por not null default 'nenhuma',
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, nome)
);

create table canal_parametros (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  canal_id uuid not null references canais (id) on delete cascade,
  comissao_pct numeric(6,4) check (comissao_pct is null or (comissao_pct >= 0 and comissao_pct < 1)),
  taxa_pagamento_pct numeric(6,4) check (taxa_pagamento_pct is null or (taxa_pagamento_pct >= 0 and taxa_pagamento_pct < 1)),
  embalagem numeric(12,2) not null default 0,
  entrega numeric(12,2) not null default 0,
  mensalidade numeric(12,2) not null default 0,
  vigencia_inicio date not null,
  vigencia_fim date,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  exclude using gist (canal_id with =, daterange(vigencia_inicio, vigencia_fim, '[)') with &&)
);

create or replace function f_canal_parametro_temporal() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update canal_parametros set vigencia_fim = new.vigencia_inicio
    where canal_id = new.canal_id and id <> new.id and vigencia_fim is null and vigencia_inicio < new.vigencia_inicio;
  end if;
  return new;
end $$;
create trigger tg_canal_parametros_temporal before insert on canal_parametros for each row execute function f_canal_parametro_temporal();

-- Modelos de cronograma e checklist, para gerar o dia.
create table cronograma_modelo (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  etapa text not null,
  praca text,
  hora_inicio time not null,
  hora_fim time not null,
  dias_semana integer[] not null default '{0,2,3,4,5,6}',
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

create table checklist_modelo (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  praca text not null,
  tipo tipo_checklist not null,
  itens jsonb not null default '[]',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, praca, tipo)
);

-- Gatilhos de atualizado_em em todas as tabelas de cadastro.
do $$
declare t text;
begin
  foreach t in array array['fornecedores','insumos','insumo_precos','insumo_fornecedores','producoes','producao_itens','producao_custos','secoes','produtos','produto_precos','fichas','ficha_itens','custos_referencia','metas_cmv','combos_2x1','plano_contas','orcamentos','parametros','colaboradores','processos_criticos','certificacoes','documentos_risco','clientes','canais','canal_parametros','cronograma_modelo','checklist_modelo'] loop
    execute format('create trigger tg_%s_atualizado before update on %I for each row execute function f_marcar_atualizado_em()', t, t);
  end loop;
end $$;
