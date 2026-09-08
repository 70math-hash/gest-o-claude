-- QT GESTÃO · 0004 · Row Level Security e os quatro perfis.
--
-- dono e gestor: tudo da sua unidade.
-- cozinha: lê cadastro e movimento operacional; escreve captura de cozinha.
-- salao: lê produtos e parâmetros; escreve reservas, atendimentos e clientes.
-- Sem perfil ativo, nada é visível.

create or replace function f_aplicar_rls(tabela text, leitura text[], escrita text[])
returns void language plpgsql as $$
declare
  cond_ler text;
  cond_escrever text;
begin
  execute format('alter table %I enable row level security', tabela);
  execute format('alter table %I force row level security', tabela);
  cond_ler := format('unidade_id = f_unidade_atual() and f_perfil_atual() = any (%L::perfil_acesso[])', leitura);
  cond_escrever := format('unidade_id = f_unidade_atual() and f_perfil_atual() = any (%L::perfil_acesso[])', escrita);
  execute format('create policy %I on %I for select using (%s)', 'ler_' || tabela, tabela, cond_ler);
  execute format('create policy %I on %I for insert with check (%s)', 'inserir_' || tabela, tabela, cond_escrever);
  execute format('create policy %I on %I for update using (%s) with check (%s)', 'alterar_' || tabela, tabela, cond_escrever, cond_escrever);
  execute format('create policy %I on %I for delete using (%s)', 'apagar_' || tabela, tabela, cond_escrever);
end $$;

-- Unidades e perfis: leitura pela própria unidade; escrita só do dono.
alter table unidades enable row level security;
create policy ler_unidades on unidades for select using (id = f_unidade_atual());
create policy alterar_unidades on unidades for update using (id = f_unidade_atual() and f_perfil_atual() = 'dono');

alter table perfis enable row level security;
create policy ler_perfis on perfis for select using (unidade_id = f_unidade_atual());
create policy alterar_perfis on perfis for update using (unidade_id = f_unidade_atual() and f_perfil_atual() = 'dono');
create policy apagar_perfis on perfis for delete using (unidade_id = f_unidade_atual() and f_perfil_atual() = 'dono');

alter table usuarios_autorizados enable row level security;
create policy ler_autorizados on usuarios_autorizados for select using (unidade_id = f_unidade_atual() and f_e_gestao());
create policy inserir_autorizados on usuarios_autorizados for insert with check (unidade_id = f_unidade_atual() and f_perfil_atual() = 'dono');
create policy alterar_autorizados on usuarios_autorizados for update using (unidade_id = f_unidade_atual() and f_perfil_atual() = 'dono');
create policy apagar_autorizados on usuarios_autorizados for delete using (unidade_id = f_unidade_atual() and f_perfil_atual() = 'dono');

do $$
declare
  todos perfil_acesso[] := '{dono,gestor,cozinha,salao}';
  gestao perfil_acesso[] := '{dono,gestor}';
  gestao_cozinha perfil_acesso[] := '{dono,gestor,cozinha}';
  gestao_salao perfil_acesso[] := '{dono,gestor,salao}';
  t text;
begin
  -- Cadastro: todos leem, gestão escreve.
  foreach t in array array['fornecedores','insumos','insumo_precos','insumo_fornecedores','producoes','producao_itens','producao_custos','secoes','produtos','produto_precos','fichas','ficha_itens','custos_referencia','metas_cmv','combos_2x1','plano_contas','orcamentos','parametros','colaboradores','processos_criticos','certificacoes','documentos_risco','canais','canal_parametros','cronograma_modelo','checklist_modelo'] loop
    perform f_aplicar_rls(t, todos::text[], gestao::text[]);
  end loop;
  -- Clientes: salão e gestão escrevem.
  perform f_aplicar_rls('clientes', todos::text[], gestao_salao::text[]);
  -- Importações e vendas: gestão.
  foreach t in array array['importacoes','importacao_pendencias','vendas_itens','vendas_dia','vendas_colaborador_dia','compras','despesas','classificacao_regras','conciliacao_dia','folha_mensal','caixa_projecao','decisoes_engenharia','escalas'] loop
    perform f_aplicar_rls(t, todos::text[], gestao::text[]);
  end loop;
  -- Captura da cozinha: cozinha e gestão escrevem.
  foreach t in array array['compra_itens','inventarios','inventario_itens','perdas','producao_diaria','bateladas','cronograma_etapas','checklists','forno_medicoes'] loop
    perform f_aplicar_rls(t, todos::text[], gestao_cozinha::text[]);
  end loop;
  -- Captura do salão.
  foreach t in array array['atendimentos','reservas'] loop
    perform f_aplicar_rls(t, todos::text[], gestao_salao::text[]);
  end loop;
end $$;

-- Recebimento também é da cozinha (compras abre a nota, itens entram por cozinha ou gestor).
drop policy inserir_compras on compras;
create policy inserir_compras on compras for insert with check (unidade_id = f_unidade_atual() and f_perfil_atual() in ('dono','gestor','cozinha'));
drop policy alterar_compras on compras;
create policy alterar_compras on compras for update using (unidade_id = f_unidade_atual() and f_perfil_atual() in ('dono','gestor','cozinha')) with check (unidade_id = f_unidade_atual() and f_perfil_atual() in ('dono','gestor','cozinha'));
