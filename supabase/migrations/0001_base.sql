-- QT GESTÃO · 0001 · Base: extensões, tipos, unidades, perfis e utilitários.
-- Nomes em português, snake_case. Toda tabela tem id, criado_em, criado_por,
-- atualizado_em e unidade_id (D-009).

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists btree_gist;

-- Tipos enumerados ------------------------------------------------------------
create type perfil_acesso as enum ('dono', 'gestor', 'cozinha', 'salao');
create type bloco_cardapio as enum ('pizza', 'entrada', 'sobremesa', 'bar', 'salao');
create type base_estoque as enum ('cozinha', 'bar');
create type segmento_venda as enum ('cozinha', 'salao', 'bar', 'delivery');
create type unidade_base as enum ('kg', 'l', 'un');
create type unidade_ficha as enum ('g', 'kg', 'ml', 'l', 'un');
create type origem_preco as enum ('cotacao', 'nota', 'manual', 'altec');
create type origem_custo_producao as enum ('calculado', 'altec', 'manual');
create type curva_abc as enum ('A', 'B', 'C');
create type natureza_conta as enum ('variavel', 'fixo', 'semifixo');
create type tipo_importacao as enum ('altec_r3', 'altec_dia', 'santander', 'comanda', 'cadastro');
create type status_importacao as enum ('pendente', 'concluida', 'rejeitada');
create type tipo_inventario as enum ('rotativo', 'geral');
create type motivo_perda as enum ('quebra', 'vencimento', 'erro', 'cortesia', 'degustacao', 'teste');
create type tipo_checklist as enum ('abertura', 'fechamento');
create type origem_despesa as enum ('manual', 'santander');
create type status_reserva as enum ('confirmada', 'compareceu', 'no_show', 'cancelada');
create type tipo_canal as enum ('salao', 'proprio', 'marketplace');
create type entrega_por as enum ('casa', 'plataforma', 'nenhuma');
create type matriz_engenharia as enum ('kasavana_smith', 'miller');
create type tipo_pendencia_importacao as enum ('produto_sem_mapeamento', 'categoria_desconhecida', 'gratuita_2x1_a_confirmar');

-- Unidades (casas) ---------------------------------------------------------------
create table unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null default 'São Paulo',
  fuso text not null default 'America/Sao_Paulo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Perfis: um usuário do Auth pertence a uma unidade com um perfil ----------------
create table perfis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique,
  unidade_id uuid not null references unidades (id),
  email text not null,
  nome text,
  perfil perfil_acesso not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now()
);

-- Lista de e-mails autorizados: quem entra pela primeira vez com um e-mail
-- desta lista ganha o perfil indicado. Sem entrada aqui, o login não abre
-- nenhuma tela (RLS nega tudo).
create table usuarios_autorizados (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  email text not null unique,
  nome text,
  perfil perfil_acesso not null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now()
);

-- Utilitários -------------------------------------------------------------------
create or replace function f_usuario_atual() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function f_perfil_atual() returns perfil_acesso
language sql stable security definer set search_path = public as $$
  select perfil from perfis where usuario_id = auth.uid() and ativo limit 1
$$;

create or replace function f_unidade_atual() returns uuid
language sql stable security definer set search_path = public as $$
  select unidade_id from perfis where usuario_id = auth.uid() and ativo limit 1
$$;

create or replace function f_e_gestao() returns boolean
language sql stable as $$ select f_perfil_atual() in ('dono', 'gestor') $$;

create or replace function f_marcar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- Texto normalizado para comparação (sem acento, maiúsculas, espaços colapsados).
create or replace function f_normalizar(texto text) returns text
language sql immutable as $$
  select regexp_replace(upper(unaccent(coalesce(texto, ''))), '\s+', ' ', 'g')
$$;

-- Chave de nome de produto do Altec: normalizada e sem sufixos operacionais.
create or replace function f_nome_chave(texto text) returns text
language sql immutable as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(f_normalizar(texto), '\(ENTRADA\)', '', 'g'), '^PIZZA ', '', 'g'), ' PAIOLZINHO$', '', 'g'))
$$;

-- Ao criar um usuário no Auth com e-mail autorizado, cria o perfil.
create or replace function f_criar_perfil_autorizado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  aut usuarios_autorizados%rowtype;
begin
  select * into aut from usuarios_autorizados where lower(email) = lower(new.email);
  if found then
    insert into perfis (usuario_id, unidade_id, email, nome, perfil)
    values (new.id, aut.unidade_id, new.email, aut.nome, aut.perfil)
    on conflict (usuario_id) do nothing;
  end if;
  return new;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    execute 'create trigger tg_perfil_autorizado after insert on auth.users for each row execute function f_criar_perfil_autorizado()';
  end if;
end $$;

-- Também cobre quem já existia no Auth antes da autorização: ao autorizar um
-- e-mail, se o usuário já existe, o perfil é criado na hora.
create or replace function f_autorizar_existente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    execute 'select id from auth.users where lower(email) = lower($1) limit 1' into uid using new.email;
    if uid is not null then
      insert into perfis (usuario_id, unidade_id, email, nome, perfil)
      values (uid, new.unidade_id, new.email, new.nome, new.perfil)
      on conflict (usuario_id) do update set perfil = excluded.perfil, unidade_id = excluded.unidade_id, ativo = true;
    end if;
  end if;
  return new;
end $$;

create trigger tg_autorizar_existente after insert or update on usuarios_autorizados
for each row execute function f_autorizar_existente();

create trigger tg_unidades_atualizado before update on unidades for each row execute function f_marcar_atualizado_em();
create trigger tg_perfis_atualizado before update on perfis for each row execute function f_marcar_atualizado_em();
create trigger tg_autorizados_atualizado before update on usuarios_autorizados for each row execute function f_marcar_atualizado_em();
