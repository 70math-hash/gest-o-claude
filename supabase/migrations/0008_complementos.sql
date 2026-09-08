-- QT GESTÃO · 0008 · Complementos das telas: itens indisponíveis do dia
-- (pré-serviço) e sequência de versão de POP.

create table indisponiveis (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id) default f_unidade_atual(),
  data date not null,
  produto_id uuid not null references produtos (id),
  motivo text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  unique (unidade_id, data, produto_id)
);
create trigger tg_indisponiveis_atualizado before update on indisponiveis for each row execute function f_marcar_atualizado_em();
select f_aplicar_rls('indisponiveis', '{dono,gestor,cozinha,salao}', '{dono,gestor,cozinha,salao}');

-- Quem tem perfil pode ler o próprio perfil mesmo sem unidade (login inicial).
drop policy if exists ler_perfis on perfis;
create policy ler_perfis on perfis for select using (usuario_id = auth.uid() or unidade_id = f_unidade_atual());
