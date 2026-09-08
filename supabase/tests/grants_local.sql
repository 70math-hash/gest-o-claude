-- Permissões que o Supabase concede por padrão ao papel authenticated.
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema auth to anon, authenticated;
-- Usuário local do dono (o JWT local aponta para este id); o gatilho cria o perfil.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000aa01', '70math@gmail.com') on conflict (id) do nothing;
