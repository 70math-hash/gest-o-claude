-- QT GESTÃO · Semente mínima (seção 13) com as fichas reais de abril de 2026.
-- Valores a revisar no cadastro. Idempotente: pode rodar mais de uma vez.

insert into unidades (id, nome) values ('00000000-0000-0000-0000-000000000001', 'QT Pizza Bar')
on conflict (id) do nothing;

insert into usuarios_autorizados (unidade_id, email, nome, perfil)
values ('00000000-0000-0000-0000-000000000001', '70math@gmail.com', 'Matheus Ramos', 'dono')
on conflict (email) do nothing;

-- 13.5 Parâmetros iniciais. Imposto: Simples Nacional (D-008), alíquota
-- efetiva calculada pelo RBT12 quando houver; taxa de pagamento 3,5% é a
-- referência das seções 11.5 e 11.9, a confirmar com a adquirente.
insert into parametros (unidade_id, dias_operacao, taxa_servico_pct, fator_seguranca_padrao, alerta_documento_dias, fator_popularidade, cozinheiros_padrao, regime_tributario, simples_anexo, taxa_pagamento_pct, forno_pizzas_hora)
values ('00000000-0000-0000-0000-000000000001', '{0,2,3,4,5,6}', 0.13, 1.10, 60, 0.70, 4, 'simples_nacional', 'I', 0.035, 60)
on conflict (unidade_id) do nothing;

-- Seções com pisos e tetos (seção 1).
insert into secoes (unidade_id, nome, bloco, piso, teto, ordem) values
  ('00000000-0000-0000-0000-000000000001', 'Classiche', 'pizza', 58, 150, 1),
  ('00000000-0000-0000-0000-000000000001', 'Non Così Classiche', 'pizza', 60, 110, 2),
  ('00000000-0000-0000-0000-000000000001', 'Speciali', 'pizza', 55, 120, 3),
  ('00000000-0000-0000-0000-000000000001', 'Queijos Brasileiros', 'pizza', 65, 80, 4),
  ('00000000-0000-0000-0000-000000000001', 'Entradas', 'entrada', null, null, 5),
  ('00000000-0000-0000-0000-000000000001', 'Sobremesas', 'sobremesa', null, null, 6),
  ('00000000-0000-0000-0000-000000000001', 'Bar', 'bar', null, null, 7),
  ('00000000-0000-0000-0000-000000000001', 'Salão', 'salao', null, null, 8)
on conflict (unidade_id, nome) do nothing;

-- Metas de CMV (seção 1): meta é teto, não alvo.
insert into metas_cmv (unidade_id, bloco, meta_pct, teto_pct, observacao, vigencia_inicio)
select '00000000-0000-0000-0000-000000000001', b, m, t, o, date '2026-01-01'
from (values
  ('pizza', 0.23, 0.25, 'perto de 25% em dia de 2x1; receita bruta nunca é descontada pelo 2x1; o custo das gratuitas soma ao custo base'),
  ('entrada', 0.25, 0.33, 'acima de 25% o item entra em revisão; acima de 33% é alerta crítico'),
  ('sobremesa', 0.15, null, 'bloco de altíssima margem'),
  ('casa', 0.30, null, 'CMV total por estoque, comida e bebida juntas, como aparece no DRE')
) as v(b, m, t, o)
where not exists (select 1 from metas_cmv where unidade_id = '00000000-0000-0000-0000-000000000001' and bloco = v.b);

-- Plano de contas (anexo B da apostila ainda não recebido: estrutura de partida, D-014).
insert into plano_contas (unidade_id, codigo, grupo, nome, natureza, dono, linha_dre, ordem)
select '00000000-0000-0000-0000-000000000001', c, g, n, nat::natureza_conta, d::perfil_acesso, l, o
from (values
  ('1.01', 'Impostos e taxas', 'Simples Nacional', 'variavel', 'dono', 'impostos', 1),
  ('1.02', 'Impostos e taxas', 'Taxas de cartão e adquirente', 'variavel', 'gestor', 'taxas_pagamento', 2),
  ('1.03', 'Impostos e taxas', 'Comissões de marketplace', 'variavel', 'gestor', 'comissoes_marketplace', 3),
  ('2.01', 'Custo da mercadoria', 'Compras de cozinha', 'variavel', 'gestor', 'cmv', 4),
  ('2.02', 'Custo da mercadoria', 'Compras de bar', 'variavel', 'gestor', 'cmv', 5),
  ('2.03', 'Custo da mercadoria', 'Embalagem de delivery', 'variavel', 'gestor', 'embalagem', 6),
  ('3.01', 'Folha', 'Salários', 'fixo', 'dono', 'folha', 7),
  ('3.02', 'Folha', 'Encargos', 'fixo', 'dono', 'folha', 8),
  ('3.03', 'Folha', 'Benefícios (VT, VR, plano)', 'fixo', 'dono', 'folha', 9),
  ('3.04', 'Folha', 'Horas extras', 'semifixo', 'gestor', 'folha', 10),
  ('3.05', 'Folha', 'Freelancers e extras', 'semifixo', 'gestor', 'folha', 11),
  ('4.01', 'Ocupação', 'Aluguel', 'fixo', 'dono', 'ocupacao', 12),
  ('4.02', 'Ocupação', 'Condomínio e IPTU', 'fixo', 'dono', 'ocupacao', 13),
  ('4.03', 'Ocupação', 'Seguro', 'fixo', 'dono', 'ocupacao', 14),
  ('5.01', 'Utilidades', 'Energia elétrica', 'semifixo', 'gestor', 'utilidades', 15),
  ('5.02', 'Utilidades', 'Água', 'semifixo', 'gestor', 'utilidades', 16),
  ('5.03', 'Utilidades', 'Gás', 'semifixo', 'gestor', 'utilidades', 17),
  ('5.04', 'Utilidades', 'Internet e telefone', 'fixo', 'gestor', 'utilidades', 18),
  ('6.01', 'Operacional', 'Manutenção e reparos', 'semifixo', 'gestor', 'operacional', 19),
  ('6.02', 'Operacional', 'Limpeza e descartáveis', 'semifixo', 'gestor', 'operacional', 20),
  ('6.03', 'Operacional', 'Sistemas e software', 'fixo', 'gestor', 'operacional', 21),
  ('6.04', 'Operacional', 'Contabilidade e jurídico', 'fixo', 'dono', 'operacional', 22),
  ('6.05', 'Operacional', 'Uniformes e utensílios', 'semifixo', 'gestor', 'operacional', 23),
  ('6.06', 'Operacional', 'Transporte e entregas próprias', 'semifixo', 'gestor', 'operacional', 24),
  ('6.07', 'Operacional', 'Segurança e alarme', 'fixo', 'gestor', 'operacional', 25),
  ('7.01', 'Marketing', 'Mídia e impulsionamento', 'semifixo', 'dono', 'marketing', 26),
  ('7.02', 'Marketing', 'Agência, fotos e conteúdo', 'semifixo', 'dono', 'marketing', 27),
  ('7.03', 'Marketing', 'Eventos e degustações', 'semifixo', 'dono', 'marketing', 28),
  ('8.01', 'Financeiro', 'Tarifas bancárias', 'fixo', 'dono', 'financeiro', 29),
  ('8.02', 'Financeiro', 'Juros e empréstimos', 'fixo', 'dono', 'financeiro', 30),
  ('9.01', 'Fora do resultado operacional', 'Pró-labore', 'fixo', 'dono', 'pro_labore', 31),
  ('9.02', 'Fora do resultado operacional', 'Depreciação', 'fixo', 'dono', 'depreciacao', 32),
  ('9.03', 'Fora do resultado operacional', 'Investimentos e equipamentos', 'fixo', 'dono', 'investimento', 33),
  ('9.99', 'Outros', 'A classificar', 'semifixo', 'gestor', 'outros', 34)
) as v(c, g, n, nat, d, l, o)
where not exists (select 1 from plano_contas where unidade_id = '00000000-0000-0000-0000-000000000001' and grupo = v.g and nome = v.n);

-- Canais (seção 5.9 e resposta 2): iFood, 99Food, Keeta e Rappi. Comissão nula
-- é "sem dado": a tela pede o parâmetro antes de calcular margem.
insert into canais (unidade_id, nome, tipo, entrega_por, ordem)
select '00000000-0000-0000-0000-000000000001', n, t::tipo_canal, e::entrega_por, o
from (values
  ('Salão', 'salao', 'nenhuma', 1),
  ('Delivery próprio (casa entrega)', 'proprio', 'casa', 2),
  ('iFood Básico (casa entrega)', 'marketplace', 'casa', 3),
  ('iFood Entrega (plataforma entrega)', 'marketplace', 'plataforma', 4),
  ('iFood Flex', 'marketplace', 'casa', 5),
  ('Rappi (plataforma entrega)', 'marketplace', 'plataforma', 6),
  ('99Food', 'marketplace', 'plataforma', 7),
  ('Keeta', 'marketplace', 'plataforma', 8)
) as v(n, t, e, o)
where not exists (select 1 from canais where unidade_id = '00000000-0000-0000-0000-000000000001' and nome = v.n);

insert into canal_parametros (unidade_id, canal_id, comissao_pct, taxa_pagamento_pct, embalagem, entrega, vigencia_inicio)
select '00000000-0000-0000-0000-000000000001', c.id, v.com, v.tx, v.emb, v.ent, date '2026-01-01'
from (values
  ('Salão', 0.00, 0.032, 0, 0),
  ('Delivery próprio (casa entrega)', 0.00, 0.032, 3, 9),
  ('iFood Básico (casa entrega)', 0.12, 0.032, 3, 9),
  ('iFood Entrega (plataforma entrega)', 0.23, 0.032, 3, 0),
  ('iFood Flex', 0.24, null, 3, 9),
  ('Rappi (plataforma entrega)', 0.27, 0.035, 3, 0),
  ('99Food', null, null, 3, 0),
  ('Keeta', null, null, 3, 0)
) as v(n, com, tx, emb, ent)
join canais c on c.unidade_id = '00000000-0000-0000-0000-000000000001' and c.nome = v.n
where not exists (select 1 from canal_parametros cp where cp.canal_id = c.id);

-- 13.2 e fichas: insumos com preço e rendimento (valores de abril de 2026,
-- vigência desde 01/01/2026, D-016), origem Altec.
insert into insumos (unidade_id, nome, categoria, base, unidade_uso)
select '00000000-0000-0000-0000-000000000001', n, c, 'cozinha', u::unidade_base
from (values
  ('Fior di latte', 'Queijos', 'kg'), ('Grana padano 12 meses', 'Queijos', 'kg'), ('Mozzarella de búfala', 'Queijos', 'kg'),
  ('Mozzarella de búfala (entradas)', 'Queijos', 'kg'), ('Mozzarella de búfala em barra', 'Queijos', 'kg'), ('Burrata', 'Queijos', 'un'),
  ('Gorgonzola', 'Queijos', 'kg'), ('Catupiry', 'Queijos', 'kg'), ('Pecorino', 'Queijos', 'kg'), ('Queijo Boursin', 'Queijos', 'kg'),
  ('Queijo quina', 'Queijos', 'kg'), ('Provolone', 'Queijos', 'kg'), ('Queijo coalho', 'Queijos', 'kg'),
  ('Molho San Marzano', 'Molhos e tomates', 'kg'), ('Tomate San Marzano La Solania', 'Molhos e tomates', 'kg'), ('Tomate', 'Molhos e tomates', 'kg'),
  ('Tomate italiano', 'Molhos e tomates', 'kg'), ('Tomate assado', 'Molhos e tomates', 'kg'), ('Tomate ressecado', 'Molhos e tomates', 'kg'),
  ('Tomate ciliegini amarelo', 'Molhos e tomates', 'kg'), ('Aioli de tomate seco', 'Molhos e tomates', 'kg'),
  ('Manjericão italiano', 'Hortifruti', 'kg'), ('Manjericão bar', 'Hortifruti', 'kg'), ('Rúcula selvagem', 'Hortifruti', 'kg'), ('Alho roxo', 'Hortifruti', 'kg'),
  ('Picles de maçã verde', 'Hortifruti', 'kg'), ('Mix de cogumelos', 'Hortifruti', 'kg'),
  ('Calabresa', 'Carnes e frios', 'kg'), ('Speck', 'Carnes e frios', 'kg'), ('Guanciale', 'Carnes e frios', 'kg'), ('Pastrami cortado', 'Carnes e frios', 'kg'),
  ('Pepperoni fatiado', 'Carnes e frios', 'kg'), ('Presunto cru', 'Carnes e frios', 'kg'), ('Patinho', 'Carnes e frios', 'kg'), ('Peito de frango', 'Carnes e frios', 'kg'),
  ('Camarão', 'Carnes e frios', 'kg'), ('Filet mignon', 'Carnes e frios', 'kg'), ('Barriga de porco', 'Carnes e frios', 'kg'),
  ('Azeite', 'Mercearia', 'l'), ('Mel trufado', 'Mercearia', 'kg'), ('Mel', 'Mercearia', 'kg'), ('Melaço de romã', 'Mercearia', 'kg'), ('Flor de sal', 'Mercearia', 'kg'),
  ('Pimenta calabresa', 'Mercearia', 'kg'), ('Pesto de rúcula', 'Mercearia', 'kg'), ('Chimichurri', 'Mercearia', 'kg'),
  ('Farinha Superiore', 'Farinhas e pães', 'kg'), ('Farinha panko', 'Farinhas e pães', 'kg'), ('Pão italiano', 'Farinhas e pães', 'kg'),
  ('Água', 'Utilidades', 'l')
) as v(n, c, u)
on conflict (unidade_id, nome) do nothing;

insert into insumo_precos (unidade_id, insumo_id, preco_por_unidade, rendimento_pct, vigencia_inicio, origem)
select '00000000-0000-0000-0000-000000000001', i.id, v.p, v.r, date '2026-01-01', 'altec'
from (values
  ('Fior di latte', 65.00, 1.00), ('Grana padano 12 meses', 115.25, 0.88), ('Mozzarella de búfala', 45.35, 0.92),
  ('Mozzarella de búfala (entradas)', 65.09, 0.92), ('Mozzarella de búfala em barra', 62.65, 1.00), ('Burrata', 19.90, 1.00),
  ('Gorgonzola', 175.00, 0.92), ('Catupiry', 41.99, 0.82), ('Pecorino', 269.65, 1.00), ('Queijo Boursin', 78.90, 0.90),
  ('Queijo quina', 88.00, 1.00), ('Provolone', 69.00, 1.00), ('Queijo coalho', 61.10, 1.00),
  ('Molho San Marzano', 68.67, 0.88), ('Tomate San Marzano La Solania', 68.68, 1.00), ('Tomate', 7.90, 1.00),
  ('Tomate italiano', 9.90, 0.70), ('Tomate assado', 9.90, 1.00), ('Tomate ressecado', 99.00, 1.00),
  ('Tomate ciliegini amarelo', 93.60, 1.00), ('Aioli de tomate seco', 15.89, 1.00),
  ('Manjericão italiano', 299.00, 0.60), ('Manjericão bar', 29.90, 1.00), ('Rúcula selvagem', 242.10, 0.85), ('Alho roxo', 33.00, 0.88),
  ('Picles de maçã verde', 0.00, 1.00), ('Mix de cogumelos', 65.78, 0.88),
  ('Calabresa', 73.12, 0.70), ('Speck', 324.46, 1.00), ('Guanciale', 95.00, 1.00), ('Pastrami cortado', 287.00, 1.00),
  ('Pepperoni fatiado', 177.69, 0.95), ('Presunto cru', 178.37, 1.00), ('Patinho', 36.90, 1.00), ('Peito de frango', 16.80, 1.00),
  ('Camarão', 92.00, 1.00), ('Filet mignon', 86.50, 1.00), ('Barriga de porco', 228.00, 0.88),
  ('Azeite', 55.00, 0.88), ('Mel trufado', 349.50, 0.90), ('Mel', 46.73, 1.00), ('Melaço de romã', 131.69, 1.00), ('Flor de sal', 10.41, 1.00),
  ('Pimenta calabresa', 9.15, 1.00), ('Pesto de rúcula', 174.36, 0.88), ('Chimichurri', 20.71, 1.00),
  ('Farinha Superiore', 12.75, 0.88), ('Farinha panko', 17.90, 0.88), ('Pão italiano', 13.36, 1.00),
  ('Água', 0.03, 0.95)
) as v(n, p, r)
join insumos i on i.unidade_id = '00000000-0000-0000-0000-000000000001' and i.nome = v.n
where not exists (select 1 from insumo_precos ip where ip.insumo_id = i.id);

-- 13.3 Produções intermediárias. Rendimento medido só no Tortano (2,2 kg) e no
-- Creme de abobrinha (2,1 kg); as demais entram com custo declarado no Altec
-- e batelada pendente (D-011). rendimento_uso é o RN de uso no prato (D-010).
insert into producoes (unidade_id, codigo_altec, nome, unidade_rendimento, rendimento_declarado, rendimento_uso_pct, observacao)
select '00000000-0000-0000-0000-000000000001', c, n, u::unidade_base, rd, ru, case when rd is null then 'Batelada pendente: medir rendimento e cadastrar os itens' end
from (values
  ('218', 'Tomate San Marzano', 'kg', null, 0.88), ('219', 'Massa de pizza', 'un', null, 1.00), ('221', 'Gremolata', 'kg', null, 0.88),
  ('248', 'Caponata', 'kg', null, 0.88), ('252', 'Ragu de linguiça', 'kg', null, 1.00), ('253', 'Aioli', 'kg', null, 0.92),
  ('256', 'Fondue', 'kg', null, 0.88), ('268', 'Arancini', 'kg', null, 1.00), ('269', 'Maionese de agrião', 'kg', null, 1.00),
  ('272', 'Focaccia', 'kg', null, 0.88), ('273', 'Pesto de manjericão', 'kg', null, 0.88), ('138', 'Mix de cogumelos', 'kg', null, 0.88),
  ('298', 'Tortano', 'kg', 2.2, 1.00), ('299', 'Molho de queijo', 'kg', null, 1.00), ('254', 'Creme de abobrinha', 'kg', 2.1, 1.00),
  ('487', 'Calda de café', 'kg', null, 1.00), ('420', 'Ganache de chocolate', 'kg', null, 1.00), ('120124', 'Crocante de café', 'kg', null, 1.00),
  ('120123', 'Creme coalhada de ovelha', 'kg', null, 1.00), ('301', 'Sablé', 'kg', null, 1.00), ('120128', 'Goiabada picante', 'kg', null, 1.00),
  ('488', 'Merengue', 'kg', null, 1.00), ('120133', 'Crumble de azeite', 'kg', null, 1.00), ('120132', 'Pérolas de aceto', 'kg', null, 1.00),
  ('120130', 'Panacota de manjericão', 'kg', null, 1.00), ('120131', 'Confit de morango, tomate e manjericão', 'kg', null, 1.00),
  ('120126', 'Creme La Madre', 'kg', null, 1.00), ('490', 'Doce de banana', 'kg', null, 1.00), ('120125', 'Sablé de especiarias', 'kg', null, 1.00),
  ('120122', 'Mousse de chocolate', 'kg', null, 1.00)
) as v(c, n, u, rd, ru)
on conflict (unidade_id, nome) do nothing;

insert into producao_custos (unidade_id, producao_id, custo_por_unidade, custo_batelada, custo_altec_por_unidade, origem, vigencia_inicio)
select '00000000-0000-0000-0000-000000000001', p.id, v.custo, v.batelada, v.altec, 'altec', date '2026-01-01'
from (values
  ('Tomate San Marzano', 68.57, null, null), ('Massa de pizza', 1.88, null, null), ('Gremolata', 16.60, null, null),
  ('Caponata', 22.31, null, null), ('Ragu de linguiça', 73.75, null, null), ('Aioli', 5.29, null, null),
  ('Fondue', 53.60, null, null), ('Arancini', 36.52, null, null), ('Maionese de agrião', 4.37, null, null),
  ('Focaccia', 16.82, null, null), ('Pesto de manjericão', 10.73, null, null), ('Mix de cogumelos', 56.78, null, null),
  ('Tortano', 43.30, 95.25, 108.79), ('Molho de queijo', 9.95, null, null), ('Creme de abobrinha', 9.73, null, 20.44),
  ('Calda de café', 40.27, null, null), ('Ganache de chocolate', 65.40, null, null), ('Crocante de café', 16.57, null, null),
  ('Creme coalhada de ovelha', 67.17, null, null), ('Sablé', 20.16, null, null), ('Goiabada picante', 57.21, null, null),
  ('Merengue', 10.10, null, null), ('Crumble de azeite', 19.41, null, null), ('Pérolas de aceto', 15.92, null, null),
  ('Panacota de manjericão', 13.23, null, null), ('Confit de morango, tomate e manjericão', 49.18, null, null),
  ('Creme La Madre', 9.88, null, null), ('Doce de banana', 2.62, null, null), ('Sablé de especiarias', 17.22, null, null),
  ('Mousse de chocolate', 70.56, null, null)
) as v(n, custo, batelada, altec)
join producoes p on p.unidade_id = '00000000-0000-0000-0000-000000000001' and p.nome = v.n
where not exists (select 1 from producao_custos pc where pc.producao_id = p.id);

-- 13.1 Produtos, mapeamento Altec, bloco, seção, preço e custo de referência.
insert into produtos (unidade_id, id_altec, nome_altec, nome, bloco, secao_id, sazonal)
select '00000000-0000-0000-0000-000000000001', nullif(v.id_altec, ''), v.nome_altec, v.nome, v.bloco::bloco_cardapio, s.id, v.sazonal
from (values
  ('100010', 'MARINARA', 'Marinara', 'pizza', 'Classiche', false),
  ('100011', 'MARGHERITA', 'Margherita', 'pizza', 'Classiche', false),
  ('100012', 'RUCOLA', 'Rúcola', 'pizza', 'Non Così Classiche', false),
  ('100013', 'BIANCA', 'Bianca', 'pizza', 'Classiche', false),
  ('100015', 'BURRATA PIZZA', 'Burrata', 'pizza', 'Classiche', false),
  ('100016', 'TRUFADA', 'Trufada', 'pizza', 'Speciali', false),
  ('100017', 'ABOBRINHA', 'Abobrinha', 'pizza', 'Speciali', false),
  ('100018', 'ZUCCA', 'Zucca', 'pizza', 'Speciali', false),
  ('100019', 'COG PORC', 'Cog Porc', 'pizza', 'Non Così Classiche', false),
  ('100020', 'CALABRESA', 'Calabresa', 'pizza', 'Classiche', false),
  ('100021', 'CATU', 'Catu', 'pizza', 'Non Così Classiche', false),
  ('100022', 'MORTADELA', 'Mortadela', 'pizza', 'Non Così Classiche', false),
  ('100153', 'CARBONARA', 'Carbonara', 'pizza', 'Non Così Classiche', false),
  ('100157', 'MELADO', 'Melado', 'pizza', 'Speciali', false),
  ('100188', 'QUEIJIN', 'Queijin', 'pizza', 'Non Così Classiche', false),
  ('100190', 'FANTASTICA', 'Fantástica', 'pizza', 'Speciali', false),
  ('100195', 'COSACCA', 'Cosacca', 'pizza', 'Classiche', false),
  ('100201', 'BLUE CHEESE', 'Blue Cheese', 'pizza', 'Non Così Classiche', false),
  ('100204', 'FRANGO COM AÇAFRÃO', 'Frango com Açafrão', 'pizza', 'Speciali', false),
  ('100205', 'DIAVOLETE', 'Diavolete', 'pizza', 'Speciali', false),
  ('100258', 'PASTRAMI', 'Pastrami', 'pizza', 'Speciali', false),
  ('100275', 'BRASILEIRITA', 'Brasileirita', 'pizza', 'Classiche', false),
  ('100276', 'PORPETTA', 'Porpetta', 'pizza', 'Non Così Classiche', false),
  ('120019', 'POMODORI', 'Pomodori', 'pizza', 'Speciali', false),
  ('100259', 'DOCE PAIOLZINHO', 'Doce (QB)', 'pizza', 'Queijos Brasileiros', false),
  ('100260', 'PIZZA UMAMI', 'Umami (QB)', 'pizza', 'Queijos Brasileiros', false),
  ('100261', 'PIZZA SALGADA', 'Salgada (QB)', 'pizza', 'Queijos Brasileiros', false),
  ('100262', 'PIZZA ACIDA', 'Ácida (QB)', 'pizza', 'Queijos Brasileiros', false),
  ('100263', 'PIZZA AMARGA', 'Amarga (QB)', 'pizza', 'Queijos Brasileiros', false),
  ('', 'OVO', 'Ovo', 'pizza', 'Speciali', true),
  ('100001', 'SALADA CAPRESE', 'Salada Caprese', 'entrada', 'Entradas', false),
  ('100002', 'ARANCINI', 'Arancini', 'entrada', 'Entradas', false),
  ('100004', 'BURRATA (ENTRADA)', 'Burrata (entrada)', 'entrada', 'Entradas', false),
  ('100005', 'STICKS (ENTRADA)', 'Sticks', 'entrada', 'Entradas', false),
  ('100007', 'PÃO DA CASA', 'Pão da Casa', 'entrada', 'Entradas', false),
  ('100009', 'TABUA DE BRUSCHETTA', 'Tábua de Bruschetta', 'entrada', 'Entradas', false),
  ('100179', 'FRITTO DI BUFALA', 'Fritto di Bufala', 'entrada', 'Entradas', false),
  ('', 'CARPACCIO', 'Carpaccio', 'entrada', 'Entradas', false),
  ('', 'PÃO DE CALABRESA', 'Pão de Calabresa', 'entrada', 'Entradas', false),
  ('120056', 'QTMISU 2.0', 'QTmisu 2.0', 'sobremesa', 'Sobremesas', false),
  ('120057', 'PIZZA FRITA ROMEU E JULIETA', 'Pizza Frita Romeu e Julieta', 'sobremesa', 'Sobremesas', false),
  ('120059', 'TARTELETTE CARTOLA', 'Tartelette Cartola', 'sobremesa', 'Sobremesas', false),
  ('120060', 'CHOCOLATE, AZEITE E FLOR DE SAL', 'Chocolate, Azeite e Flor de Sal', 'sobremesa', 'Sobremesas', false),
  ('', 'MORANGO E MANJERICÃO', 'Morango e Manjericão', 'sobremesa', 'Sobremesas', false)
) as v(id_altec, nome_altec, nome, bloco, secao, sazonal)
join secoes s on s.unidade_id = '00000000-0000-0000-0000-000000000001' and s.nome = v.secao
on conflict (unidade_id, nome) do nothing;

insert into produto_precos (unidade_id, produto_id, preco, vigencia_inicio)
select '00000000-0000-0000-0000-000000000001', p.id, v.preco, date '2026-01-01'
from (values
  ('Marinara', 58), ('Margherita', 62), ('Rúcola', 75), ('Bianca', 70), ('Burrata', 130), ('Trufada', 95), ('Abobrinha', 89), ('Zucca', 55),
  ('Cog Porc', 68), ('Calabresa', 68), ('Catu', 70), ('Mortadela', 72), ('Carbonara', 82), ('Melado', 79), ('Queijin', 70), ('Fantástica', 95),
  ('Cosacca', 60), ('Blue Cheese', 65), ('Frango com Açafrão', 75), ('Diavolete', 95), ('Pastrami', 78), ('Brasileirita', 62), ('Porpetta', 70),
  ('Pomodori', 75), ('Doce (QB)', 70), ('Umami (QB)', 70), ('Salgada (QB)', 70), ('Ácida (QB)', 70), ('Amarga (QB)', 70), ('Ovo', 71),
  ('Salada Caprese', 45), ('Arancini', 69), ('Burrata (entrada)', 90), ('Sticks', 40), ('Pão da Casa', 69), ('Tábua de Bruschetta', 59),
  ('Fritto di Bufala', 65), ('Carpaccio', 59), ('Pão de Calabresa', 65),
  ('QTmisu 2.0', 30), ('Pizza Frita Romeu e Julieta', 30), ('Tartelette Cartola', 30), ('Chocolate, Azeite e Flor de Sal', 30), ('Morango e Manjericão', 30)
) as v(n, preco)
join produtos p on p.unidade_id = '00000000-0000-0000-0000-000000000001' and p.nome = v.n
where not exists (select 1 from produto_precos pp where pp.produto_id = p.id);

-- Custos de referência da seção 13.1 (custo Altec de abril de 2026), usados
-- só enquanto o produto não tem ficha cadastrada (D-012). Vigência desde
-- 01/01/2026 para custear o primeiro trimestre com as fichas de abril, como
-- faz a seção 11.8 (D-016).
insert into custos_referencia (unidade_id, produto_id, custo, custo_altec, data_referencia, origem)
select '00000000-0000-0000-0000-000000000001', p.id, v.custo, v.custo, date '2026-01-01', 'especificação 13.1 (custo Altec, abril de 2026)'
from (values
  ('Marinara', 11.47), ('Margherita', 11.28), ('Rúcola', 23.64), ('Bianca', 14.42), ('Burrata', 35.91), ('Trufada', 18.39), ('Abobrinha', 12.01), ('Zucca', 2.97),
  ('Cog Porc', 16.73), ('Calabresa', 13.08), ('Catu', 15.46), ('Mortadela', 16.63), ('Carbonara', 16.38), ('Melado', 16.28), ('Queijin', 11.02), ('Fantástica', 17.10),
  ('Cosacca', 13.18), ('Blue Cheese', 16.62), ('Frango com Açafrão', 9.37), ('Diavolete', 14.49), ('Pastrami', 11.66), ('Brasileirita', 12.29), ('Porpetta', 12.50),
  ('Pomodori', 15.77), ('Doce (QB)', 13.00), ('Umami (QB)', 13.00), ('Salgada (QB)', 13.00), ('Ácida (QB)', 13.00), ('Amarga (QB)', 13.00), ('Ovo', 17.99),
  ('Salada Caprese', 11.90), ('Arancini', 6.66), ('Burrata (entrada)', 27.35), ('Sticks', 5.72), ('Pão da Casa', 13.60), ('Tábua de Bruschetta', 6.99),
  ('Fritto di Bufala', 23.30), ('Carpaccio', 14.22), ('Pão de Calabresa', 16.15),
  ('QTmisu 2.0', 5.34), ('Pizza Frita Romeu e Julieta', 0.98), ('Tartelette Cartola', 0.98), ('Chocolate, Azeite e Flor de Sal', 4.58), ('Morango e Manjericão', 2.29)
) as v(n, custo)
join produtos p on p.unidade_id = '00000000-0000-0000-0000-000000000001' and p.nome = v.n
on conflict (produto_id, data_referencia) do nothing;

-- 13.4 Combos 2x1 fixos.
insert into combos_2x1 (unidade_id, produto_gratuito_id, produto_pago_id)
select '00000000-0000-0000-0000-000000000001', g.id, pg.id
from (values ('Zucca', 'Fantástica'), ('Marinara', 'Diavolete'), ('Brasileirita', 'Pastrami')) as v(gratuita, paga)
join produtos g on g.unidade_id = '00000000-0000-0000-0000-000000000001' and g.nome = v.gratuita
join produtos pg on pg.unidade_id = '00000000-0000-0000-0000-000000000001' and pg.nome = v.paga
on conflict (produto_gratuito_id, produto_pago_id) do nothing;

-- Fichas técnicas reais (abril de 2026), versão 1. Itens por nome; a função
-- resolve para insumo ou produção.
create or replace function pg_temp.seed_ficha(p_nome text, p_itens jsonb) returns void language plpgsql as $$
declare
  pid uuid;
  itens jsonb := '[]';
  it jsonb;
  iid uuid;
  prid uuid;
begin
  select id into pid from produtos where unidade_id = '00000000-0000-0000-0000-000000000001' and nome = p_nome;
  if pid is null then raise exception 'produto % não encontrado', p_nome; end if;
  if exists (select 1 from fichas where produto_id = pid) then return; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    iid := null; prid := null;
    if it->>'tipo' = 'insumo' then
      select id into iid from insumos where unidade_id = '00000000-0000-0000-0000-000000000001' and nome = it->>'nome';
      if iid is null then raise exception 'insumo % não encontrado', it->>'nome'; end if;
    else
      select id into prid from producoes where unidade_id = '00000000-0000-0000-0000-000000000001' and nome = it->>'nome';
      if prid is null then raise exception 'produção % não encontrada', it->>'nome'; end if;
    end if;
    itens := itens || jsonb_build_object('insumo_id', iid, 'producao_id', prid, 'quantidade', (it->>'q')::numeric, 'unidade', it->>'u');
  end loop;
  perform f_nova_versao_ficha(pid, 'Cadastro inicial: ficha de abril de 2026 (Altec corrigido)', itens, date '2026-01-01');
end $$;

select pg_temp.seed_ficha('Pomodori', '[
  {"tipo":"insumo","nome":"Tomate assado","q":90,"u":"g"},
  {"tipo":"insumo","nome":"Tomate San Marzano La Solania","q":90,"u":"g"},
  {"tipo":"producao","nome":"Massa de pizza","q":1,"u":"un"},
  {"tipo":"insumo","nome":"Tomate ressecado","q":20,"u":"g"},
  {"tipo":"insumo","nome":"Aioli de tomate seco","q":10,"u":"g"},
  {"tipo":"insumo","nome":"Tomate ciliegini amarelo","q":50,"u":"g"}]');
select pg_temp.seed_ficha('Salada Caprese', '[
  {"tipo":"insumo","nome":"Mozzarella de búfala (entradas)","q":120,"u":"g"},
  {"tipo":"insumo","nome":"Tomate","q":85,"u":"g"},
  {"tipo":"insumo","nome":"Manjericão italiano","q":10,"u":"g"},
  {"tipo":"producao","nome":"Pesto de manjericão","q":40,"u":"g"}]');
select pg_temp.seed_ficha('Arancini', '[
  {"tipo":"producao","nome":"Arancini","q":180,"u":"g"},
  {"tipo":"producao","nome":"Maionese de agrião","q":20,"u":"g"}]');
select pg_temp.seed_ficha('Carpaccio', '[
  {"tipo":"insumo","nome":"Azeite","q":20,"u":"ml"},
  {"tipo":"insumo","nome":"Grana padano 12 meses","q":20,"u":"g"},
  {"tipo":"insumo","nome":"Filet mignon","q":100,"u":"g"},
  {"tipo":"producao","nome":"Aioli","q":30,"u":"g"},
  {"tipo":"producao","nome":"Focaccia","q":100,"u":"g"},
  {"tipo":"producao","nome":"Pesto de manjericão","q":30,"u":"g"}]');
select pg_temp.seed_ficha('Burrata (entrada)', '[
  {"tipo":"insumo","nome":"Burrata","q":1,"u":"un"},
  {"tipo":"insumo","nome":"Presunto cru","q":15,"u":"g"},
  {"tipo":"producao","nome":"Mix de cogumelos","q":50,"u":"g"},
  {"tipo":"producao","nome":"Gremolata","q":15,"u":"g"},
  {"tipo":"producao","nome":"Focaccia","q":100,"u":"g"}]');
select pg_temp.seed_ficha('Sticks', '[
  {"tipo":"insumo","nome":"Azeite","q":11,"u":"ml"},
  {"tipo":"insumo","nome":"Pimenta calabresa","q":30,"u":"g"},
  {"tipo":"producao","nome":"Tomate San Marzano","q":60,"u":"g"},
  {"tipo":"producao","nome":"Massa de pizza","q":0.25,"u":"un"},
  {"tipo":"producao","nome":"Gremolata","q":6,"u":"g"},
  {"tipo":"producao","nome":"Aioli","q":30,"u":"g"}]');
select pg_temp.seed_ficha('Pão da Casa', '[
  {"tipo":"insumo","nome":"Grana padano 12 meses","q":20,"u":"g"},
  {"tipo":"producao","nome":"Massa de pizza","q":0.25,"u":"un"},
  {"tipo":"producao","nome":"Gremolata","q":6,"u":"g"},
  {"tipo":"producao","nome":"Fondue","q":200,"u":"g"}]');
select pg_temp.seed_ficha('Tábua de Bruschetta', '[
  {"tipo":"insumo","nome":"Tomate italiano","q":12,"u":"g"},
  {"tipo":"insumo","nome":"Barriga de porco","q":6,"u":"g"},
  {"tipo":"producao","nome":"Caponata","q":42,"u":"g"},
  {"tipo":"producao","nome":"Ragu de linguiça","q":16,"u":"g"},
  {"tipo":"producao","nome":"Aioli","q":16,"u":"g"},
  {"tipo":"producao","nome":"Fondue","q":30,"u":"g"},
  {"tipo":"producao","nome":"Pesto de manjericão","q":8,"u":"g"},
  {"tipo":"insumo","nome":"Picles de maçã verde","q":8,"u":"g"},
  {"tipo":"insumo","nome":"Pão italiano","q":120,"u":"g"}]');
select pg_temp.seed_ficha('Fritto di Bufala', '[
  {"tipo":"insumo","nome":"Mozzarella de búfala em barra","q":250,"u":"g"},
  {"tipo":"insumo","nome":"Farinha Superiore","q":70,"u":"g"},
  {"tipo":"insumo","nome":"Farinha panko","q":70,"u":"g"},
  {"tipo":"producao","nome":"Tomate San Marzano","q":80,"u":"g"},
  {"tipo":"insumo","nome":"Água","q":70,"u":"ml"}]');
select pg_temp.seed_ficha('Pão de Calabresa', '[
  {"tipo":"producao","nome":"Tortano","q":350,"u":"g"},
  {"tipo":"producao","nome":"Molho de queijo","q":100,"u":"g"}]');
select pg_temp.seed_ficha('QTmisu 2.0', '[
  {"tipo":"producao","nome":"Calda de café","q":5,"u":"g"},
  {"tipo":"producao","nome":"Ganache de chocolate","q":10,"u":"g"},
  {"tipo":"producao","nome":"Crocante de café","q":15,"u":"g"},
  {"tipo":"producao","nome":"Creme coalhada de ovelha","q":60,"u":"g"},
  {"tipo":"producao","nome":"Sablé","q":10,"u":"g"}]');
select pg_temp.seed_ficha('Pizza Frita Romeu e Julieta', '[
  {"tipo":"insumo","nome":"Manjericão italiano","q":1,"u":"g"},
  {"tipo":"insumo","nome":"Mozzarella de búfala (entradas)","q":4,"u":"g"},
  {"tipo":"producao","nome":"Massa de pizza","q":0.04,"u":"un"},
  {"tipo":"producao","nome":"Goiabada picante","q":6,"u":"g"}]');
select pg_temp.seed_ficha('Morango e Manjericão', '[
  {"tipo":"producao","nome":"Merengue","q":10,"u":"g"},
  {"tipo":"insumo","nome":"Manjericão bar","q":1,"u":"g"},
  {"tipo":"producao","nome":"Crumble de azeite","q":10,"u":"g"},
  {"tipo":"producao","nome":"Pérolas de aceto","q":5,"u":"g"},
  {"tipo":"producao","nome":"Panacota de manjericão","q":50,"u":"g"},
  {"tipo":"producao","nome":"Confit de morango, tomate e manjericão","q":25,"u":"g"}]');
select pg_temp.seed_ficha('Tartelette Cartola', '[
  {"tipo":"producao","nome":"Creme La Madre","q":25,"u":"g"},
  {"tipo":"producao","nome":"Doce de banana","q":25,"u":"g"},
  {"tipo":"producao","nome":"Sablé de especiarias","q":30,"u":"g"},
  {"tipo":"producao","nome":"Merengue","q":15,"u":"g"}]');
select pg_temp.seed_ficha('Chocolate, Azeite e Flor de Sal', '[
  {"tipo":"producao","nome":"Focaccia","q":10,"u":"g"},
  {"tipo":"insumo","nome":"Flor de sal","q":1,"u":"g"},
  {"tipo":"insumo","nome":"Azeite","q":3,"u":"ml"},
  {"tipo":"producao","nome":"Mousse de chocolate","q":60,"u":"g"}]');

-- Modelo de cronograma do dia (estrutura inicial, a ajustar pela cozinha).
insert into cronograma_modelo (unidade_id, etapa, praca, hora_inicio, hora_fim, ordem)
select '00000000-0000-0000-0000-000000000001', e, p, hi::time, hf::time, o
from (values
  ('Abertura da cozinha e checklist de abertura', 'cozinha', '14:00', '14:20', 1),
  ('Conferência de temperaturas e PVPS das câmaras', 'cozinha', '14:20', '14:40', 2),
  ('Boleado e controle da fermentação da massa', 'massa', '14:40', '15:30', 3),
  ('Mise en place de molhos e produções do dia', 'cozinha', '15:30', '17:00', 4),
  ('Batelada do dia pesada e lançada', 'cozinha', '17:00', '17:15', 5),
  ('Acender e estabilizar o forno', 'forno', '17:00', '17:45', 6),
  ('Checklist de abertura do bar e do salão', 'salao', '17:30', '17:50', 7),
  ('Pré-serviço: briefing, reservas e indisponíveis', 'salao', '17:50', '18:00', 8),
  ('Abertura do salão', 'salao', '18:00', '18:05', 9),
  ('Produção do dia lançada (produzido e sobra)', 'cozinha', '23:00', '23:30', 10),
  ('Fechamento e limpeza da cozinha', 'cozinha', '23:30', '00:30', 11),
  ('Checklist de fechamento assinado', 'cozinha', '00:30', '00:45', 12)
) as v(e, p, hi, hf, o)
where not exists (select 1 from cronograma_modelo where unidade_id = '00000000-0000-0000-0000-000000000001');

insert into checklist_modelo (unidade_id, praca, tipo, itens)
select '00000000-0000-0000-0000-000000000001', p, t::tipo_checklist, i::jsonb
from (values
  ('cozinha', 'abertura', '["Temperatura das câmaras frias anotada","PVPS conferido e etiquetas em dia","Massa do dia boleada e fermentando","Forno aceso e estabilizado","Molhos e produções em quantidade do mapa de mise","Bancadas higienizadas"]'),
  ('cozinha', 'fechamento', '["Sobras pesadas e lançadas","Câmaras organizadas e fechadas","Forno desligado e limpo","Lixo retirado","Bancadas e piso higienizados","Gás fechado"]'),
  ('salao', 'abertura', '["Mesas montadas e reservas conferidas","Cardápios limpos","Itens indisponíveis comunicados","Caixa aberto com troco"]'),
  ('salao', 'fechamento', '["Conciliação dos quatro números feita","Reservas do dia seguinte revisadas","Salão organizado","Caixa fechado"]'),
  ('bar', 'abertura', '["Gelo e insumos do bar conferidos","Estoque de bebidas conferido","Bancada higienizada"]'),
  ('bar', 'fechamento', '["Perecíveis armazenados","Bancada e equipamentos limpos","Contagem rápida de garrafas abertas"]')
) as v(p, t, i)
on conflict (unidade_id, praca, tipo) do nothing;

insert into processos_criticos (unidade_id, nome, praca)
select '00000000-0000-0000-0000-000000000001', n, p
from (values
  ('Boleado e fermentação da massa', 'massa'), ('Abertura e forneamento', 'forno'), ('Molho de tomate e produções base', 'cozinha'),
  ('Fritura (arancini e fritto)', 'cozinha'), ('Recebimento, PVPS e temperaturas', 'cozinha'), ('Fechamento e higienização', 'cozinha'),
  ('Drinks da carta', 'bar'), ('Reservas e acolhimento', 'salao')
) as v(n, p)
on conflict (unidade_id, nome) do nothing;
