-- Simula o esquema auth do Supabase num Postgres local para os testes SQL.
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('app.usuario', true), '')::uuid $$;
create or replace function auth.role() returns text
language sql stable as $$ select coalesce(nullif(current_setting('app.papel', true), ''), 'anon') $$;
