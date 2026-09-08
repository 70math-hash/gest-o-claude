-- QT GESTÃO · 0009 · Fila de mapeamento: guarda a linha original para
-- concluir a importação quando o produto for escolhido; nome do Altec nos
-- itens de venda para o fallback por nome.

alter table importacao_pendencias add column dados jsonb not null default '{}';
alter table vendas_itens add column nome_altec text;
create index ix_vendas_itens_importacao on vendas_itens (importacao_id);

-- Resolve uma pendência de mapeamento: liga as linhas da importação ao
-- produto, aprende o ID Altec no produto e fecha a importação quando não
-- resta pendência.
create or replace function f_resolver_pendencia(p_pendencia uuid, p_produto uuid)
returns integer language plpgsql as $$
declare
  pend importacao_pendencias%rowtype;
  n integer;
begin
  select * into pend from importacao_pendencias where id = p_pendencia;
  if not found then raise exception 'pendência não encontrada'; end if;
  update vendas_itens set produto_id = p_produto
  where importacao_id = pend.importacao_id and produto_id is null
    and ((pend.id_altec is not null and id_altec = pend.id_altec) or (pend.id_altec is null and f_nome_chave(nome_altec) = f_nome_chave(pend.nome_altec)));
  get diagnostics n = row_count;
  if pend.id_altec is not null then
    update produtos set id_altec = pend.id_altec where id = p_produto and id_altec is null;
  end if;
  update importacao_pendencias set resolvido_em = now(), produto_id = p_produto where id = p_pendencia;
  if not exists (select 1 from importacao_pendencias where importacao_id = pend.importacao_id and resolvido_em is null) then
    update importacoes set status = 'concluida' where id = pend.importacao_id;
  end if;
  return n;
end $$;
