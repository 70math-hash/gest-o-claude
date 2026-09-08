# Decisões de projeto

Registro de tudo que não está na lista de perguntas da seção 14 da especificação (`docs/ESPECIFICACAO.md`) e foi decidido sem consulta. Uma entrada por decisão, numerada, com data no fuso America/Sao_Paulo e motivo. Entradas não são apagadas: uma decisão revertida ganha entrada nova que aponta para a anterior.

## D-001 · Repositório e branch de trabalho

**Data.** 07/09/2026
**Decisão.** O repositório é o `70math-hash/gest-o-claude`, já criado no GitHub com o PDF da especificação. Todo o desenvolvimento acontece na branch `claude/qt-gestao-restaurant-system-iw3knp`, conforme a instrução da sessão; a `main` recebe o trabalho por pull request quando o Matheus pedir.
**Motivo.** Não há razão para criar um segundo repositório. A branch dedicada mantém a `main` limpa até o aceite de cada fase.

## D-002 · Especificação transcrita para Markdown, PDF preservado

**Data.** 07/09/2026
**Decisão.** O PDF foi transcrito à mão para `docs/ESPECIFICACAO.md`, com as tabelas reconstruídas coluna a coluna, as fórmulas em blocos de código e o texto original mantido. O PDF saiu da raiz para `docs/QT-GESTAO-especificacao.pdf` e continua sendo a fonte primária em caso de dúvida. A transcrição foi conferida por script: os 232 números distintos do PDF aparecem no Markdown.
**Motivo.** A extração automática de texto do PDF cola as colunas das tabelas (por exemplo "11,4758" para custo 11,47 e preço 58), o que tornaria o documento ilegível e perigoso como referência de fixture. O passo 1 da seção 0 pede um único arquivo de especificação em `docs/`.

## D-003 · Datas e horários do projeto no fuso de São Paulo

**Data.** 07/09/2026
**Decisão.** Datas deste registro, do `CLAUDE.md` e de qualquer documento do projeto usam o fuso America/Sao_Paulo no formato dd/mm/aaaa. O ambiente de execução roda em UTC; a diferença aparece nos carimbos do git, que não são alterados.
**Motivo.** Regra 9 da seção 2.

## D-004 · Leitura das inconsistências internas da especificação

**Data.** 07/09/2026
**Decisão.** Ao conferir os números da seção 11 contra os da seção 13, quatro pontos não fecham. A leitura adotada, até o Matheus dizer o contrário, é:
1. Na tabela 11.3, a coluna CUSTO é o custo Altec, sem rendimento: R$ 11,90 / R$ 45,00 = 26,4% e R$ 23,30 / R$ 65,00 = 35,8% batem exatamente com a coluna "CMV Altec". O CMV real implica custo com rendimento de R$ 14,63 para a Salada Caprese e R$ 24,31 para o Fritto di Bufala. A seção 13.1 repete R$ 11,90 e R$ 23,30 dizendo que "já aplicam rendimento", o que contradiz a 11.3. Os testes de 11.3 recebem os dois custos como entrada e verificam os dois CMV; a semente da 13.1 entra como está, com esses dois itens marcados "custo a revisar" até chegarem as fichas reais (pergunta 4 da seção 14). Pomodori fecha nas duas seções (R$ 15,77, 21,0%).
2. Na 11.8, os CMV de Sticks (16,0%) e Carpaccio (25,4%) não batem com custo e preço da 13.1 (5,72 / 40 = 14,3% e 14,22 / 59 = 24,1%). O teste 11.8 é de classificação: recebe unidades e CMV por item como fixture, o piso de popularidade (32,8 unidades) e o CMV ponderado do bloco (22,2%), e verifica os quadrantes. Ele não recalcula custo. Os três itens de entrada que a 11.8 não cita serão preenchidos com o R3 real do primeiro trimestre de 2026 quando ele chegar.
3. Na 11.9, R$ 2.436,00 e R$ 29.228,00 são R$ 2.435,68 e R$ 29.228,16 arredondados para reais inteiros na exibição (93,68 × 26 = 2.435,68; × 12 = 29.228,16). O teste verifica os valores exatos com tolerância de R$ 0,01 e a exibição arredondada.
4. Na 11.2, "erro de 251%" é a razão R$ 108,79 / R$ 43,30 = 2,51, exibida como percentual inteiro. O teste verifica a razão arredondada.
**Motivo.** Os números da seção 11 são testes de aceite permanentes e precisam de leitura única antes de virar código. A leitura escolhida é a que fecha aritmeticamente com a própria tabela. As quatro leituras foram submetidas ao Matheus junto com as perguntas da seção 14.

## D-005 · Métricas exigidas pelos testes e ausentes da seção 5

**Data.** 07/09/2026
**Decisão.** Dois números da seção 11 não têm fórmula na seção 5. Pela regra 4 da seção 0, foram perguntados ao Matheus, com a fórmula proposta, antes de qualquer código:
- 11.6, receita para o lucro alvo: `receita_lucro_alvo = (custos_fixos + lucro_alvo) / mc_pct` e `clientes_lucro_alvo = receita_lucro_alvo / ticket_medio`.
- 11.9, impacto financeiro do attach: `mesas_a_mais = mesas × (attach_alvo − attach_atual)`, `ganho_por_noite = mesas_a_mais × margem_contribuicao_item`, `ganho_periodo = ganho_por_noite × noites`.
Nenhuma das duas entra no motor de cálculo antes da confirmação.
**Motivo.** "Se precisar de uma métrica que não está lá, pare e pergunte."

## D-006 · Parâmetros da casa ganham imposto, taxa de pagamento e fator de popularidade

**Data.** 07/09/2026
**Decisão.** A tabela `parametros` (seção 4.1) terá também `imposto_pct`, `taxa_pagamento_pct` e `fator_popularidade`, além dos campos listados na especificação, todos armazenados como fração, conforme a seção 5.
**Motivo.** A seção 13.5 manda preencher imposto e taxa de pagamento "no cadastro" e a 5.10 diz que o fator 0,70 é editável, mas a seção 4.1 não diz onde ficam. Uma linha por unidade em `parametros` é o lugar natural.

## D-007 · Projeto Supabase dedicado, pendente de confirmação

**Data.** 07/09/2026
**Decisão.** Proposto ao Matheus, dentro da pergunta 1 da seção 14, criar um projeto Supabase novo chamado `qt-gestao` na organização "QT Pizza Bar", região sa-east-1 (São Paulo), em vez de reaproveitar os projetos existentes ("NFe e Financeiro", "Fichas Sensoriais", "qt-avaliacoes"). Fica pendente até a resposta.
**Motivo.** Os projetos existentes têm outros esquemas e outros usos; misturar o QT GESTÃO neles compromete RLS, migrações e backups. A região de São Paulo reduz a latência das telas de captura.

## D-008 · Imposto sobre venda: Simples Nacional, Anexo I, alíquota efetiva pelo RBT12

**Data.** 07/09/2026
**Decisão.** Resposta 6 do Matheus: a casa voltou ao Simples. O sistema guarda o regime em `parametros` e calcula a alíquota efetiva do Anexo I (comércio, onde bares e restaurantes se enquadram) pela fórmula `(RBT12 × alíquota nominal − parcela a deduzir) / RBT12`, com a tabela da LC 123/2006 na redação da LC 155/2016. O RBT12 vem de `parametros.rbt12_manual` ou, quando há doze meses de fechamento do dia importados, da soma das vendas. `parametros.imposto_pct` preenchido sobrepõe tudo. Sem RBT12 e sem alíquota, as métricas que dependem de imposto mostram "sem dado" e pedem o RBT12. A taxa média de pagamento não foi respondida: a semente usa 3,5%, referência das seções 11.5 e 11.9, marcada como "a confirmar com a adquirente".
**Motivo.** A alíquota do Simples depende da receita dos doze meses anteriores; um número fixo estaria errado em poucos meses. O Anexo deve ser confirmado com o contador; a tabela está no motor (`src/motor/simples.ts`) e no SQL (`f_aliquota_simples`), testadas uma contra a outra.

## D-009 · `unidade_id` em todas as tabelas e RLS por perfil

**Data.** 07/09/2026
**Decisão.** Toda tabela, de cadastro ou de movimento, tem `unidade_id`, com padrão `f_unidade_atual()` (a unidade do perfil logado). RLS obrigatória em tudo: dono e gestor escrevem em toda a unidade; cozinha lê o cadastro e escreve produção do dia, bateladas, cronograma, checklists, recebimento, contagem e perdas; salão lê produtos e escreve reservas, atendimentos e clientes. Sem perfil ativo nada é visível.
**Motivo.** A seção 4 pede `unidade_id` só nas tabelas de movimento, mas uma política de acesso uniforme por unidade fica mais simples e segura com a coluna em todas. Os quatro perfis são os da seção 1.

## D-010 · Rendimento de uso das produções intermediárias no prato

**Data.** 07/09/2026
**Decisão.** `producoes.rendimento_uso_pct` (padrão 100%) entra na fórmula do custo da ficha para linhas de produção: `quantidade × custo_producao_por_unidade / rendimento_uso`. Com 100% a fórmula é exatamente a da seção 5.1.
**Motivo.** Os números de referência das seções 11.3 e 11.8 (Fritto di Bufala 37,4%, Carpaccio 25,4%, Sticks 16,0%, Pão da Casa 22,3%) só fecham aplicando o rendimento de uso das produções que o Altec registra na linha da ficha (tomate San Marzano 88%, aioli 92%, focaccia 88%, fondue 88%). Sem isso o Fritto daria 36,3%. Submetido ao Matheus junto com este registro.

## D-011 · Custo de produção temporal e produções com batelada pendente

**Data.** 07/09/2026
**Decisão.** `producao_custos` guarda o custo por unidade de rendimento com vigência e origem (`calculado`, `altec`, `manual`). Produções importadas do Altec com custo declarado mas rendimento de batelada não medido entram com `rendimento_declarado` nulo e a observação "batelada pendente"; o bloqueio da seção 8 vale para cadastrar itens da batelada, lançar batelada e recalcular custo, que exigem rendimento. A ficha que usa uma produção pendente mostra a pendência.
**Motivo.** A seção 13.3 lista dez produções, oito sem rendimento medido, e a 6.4 pede relatório de inconsistência para "produção sem rendimento": importar e sinalizar é o comportamento esperado; recusar o cadastro deixaria a maioria das entradas e sobremesas sem custo no primeiro dia. Observação para o Matheus: o custo do Tortano (R$ 95,25 a batelada, R$ 43,30/kg) foi calculado sem aplicar rendimento aos insumos da batelada; quando a batelada for cadastrada com rendimento, o custo por quilo sobe (na ordem de R$ 52/kg).

## D-012 · Custo de referência para produto sem ficha

**Data.** 07/09/2026
**Decisão.** `custos_referencia` guarda o custo da seção 13.1 por produto com data e origem. O custo do produto numa data usa a ficha vigente; sem ficha, usa a referência vigente e a tela rotula "custo de referência de dd/mm/aaaa, ficha não cadastrada". Sem ficha e sem referência, "sem dado".
**Motivo.** Só quinze produtos têm ficha completa conhecida (entradas, sobremesas e Pomodori). Os demais têm apenas o custo total de abril de 2026, que é um número medido, não inventado, e será substituído quando o export de fichas do Altec chegar (pergunta 4).

## D-013 · Canais com parâmetros temporais; 99Food e Keeta sem comissão informada

**Data.** 07/09/2026
**Decisão.** `canais` e `canal_parametros` (comissão, taxa de pagamento, embalagem, entrega, mensalidade, vigência). Semente: Salão, Delivery próprio, iFood Básico (12% + 3,2%, casa entrega), iFood Entrega (23% + 3,2%, plataforma), iFood Flex (24%, taxa de pagamento não informada), Rappi (27% + 3,5%, plataforma), 99Food e Keeta (comissão e taxa não informadas). Canal sem parâmetro mostra "sem dado" e pede o número.
**Motivo.** Resposta 2 do Matheus pede os quatro marketplaces; a seção 5.9 só traz os valores do iFood e do Rappi. Nada é inventado para 99Food e Keeta.

## D-014 · Plano de contas inicial

**Data.** 07/09/2026
**Decisão.** O anexo B da apostila não foi recebido. A semente traz 34 contas em grupos (impostos e taxas, custo da mercadoria, folha, ocupação, utilidades, operacional, marketing, financeiro, fora do resultado) com natureza (variável, fixo, semifixo), dono e a linha do DRE em que entram (`linha_dre`). Editável no cadastro.
**Motivo.** O DRE vertical (5.6) precisa saber em que linha cada conta cai; a coluna `linha_dre` é o que liga o plano de contas ao DRE sem hard-code.

## D-015 · Receita bruta exclui a taxa de serviço

**Data.** 07/09/2026
**Decisão.** `vendas_dia.faturamento_bruto` é a venda sem os 13% de taxa de serviço, que fica em `vendas_dia.taxa_servico` e aparece separada no painel do dia ("faturamento total com taxa de serviço"). Receita bruta do DRE, base do Simples, ticket médio e CMV usam o valor sem taxa.
**Motivo.** A seção 4.2 separa os dois campos e a seção 7.2 mostra o total com taxa como leitura própria. Misturar a taxa na receita inflaria o denominador do CMV.

## D-016 · Vigência da semente desde 01/01/2026

**Data.** 07/09/2026
**Decisão.** Preços, custos de produção, fichas, preços de venda e custos de referência da semente valem desde 01/01/2026, embora sejam valores de abril de 2026.
**Motivo.** A seção 11.8 custeia as vendas do primeiro trimestre com as fichas de abril. Com vigência em abril, todo R3 anterior ficaria "sem dado". A regra 4 continua valendo: os valores não são sobrescritos, só a data inicial da primeira vigência é anterior.

## D-017 · Login por link mágico e lista de e-mails autorizados

**Data.** 07/09/2026
**Decisão.** Sem senha: o usuário informa o e-mail, recebe o link do Supabase Auth e entra. `usuarios_autorizados` diz quem entra e com qual perfil; um gatilho cria o perfil no primeiro acesso. E-mail fora da lista entra no Auth mas não vê nada (RLS). Matheus (70math@gmail.com) é o dono.
**Motivo.** Resposta 5: só o Matheus por enquanto, sem apego. Link mágico dispensa gestão de senha no celular da cozinha e o dono adiciona pessoas pela tela de usuários.

## D-018 · Views da seção 4.3 como funções SQL com parâmetros

**Data.** 07/09/2026
**Decisão.** Cada `v_*` da seção 4.3 é uma função SQL que recebe unidade e período (ou data) e devolve linhas; o painel único (`v_painel_unico`) devolve código, valor, meta, semáforo e o que falta, e a interface junta com o catálogo de fórmulas do motor (`src/motor/formulas.ts`) para mostrar fórmula, dono, origem e frequência. Um teste (`supabase/tests/consistencia.test.ts`) compara as funções SQL com o motor TypeScript.
**Motivo.** A especificação pede "todas com os mesmos parâmetros de período e unidade"; views do Postgres não recebem parâmetros, funções recebem, e o PostgREST expõe as duas do mesmo jeito.

## D-019 · Postgres local para os testes SQL; projeto Supabase pendente

**Data.** 07/09/2026
**Decisão.** Os testes de consistência rodam num Postgres 16 local (porta 5433) com um esquema `auth` simulado, porque o Docker do ambiente não está disponível para o Supabase local. A criação do projeto `qt-gestao` no Supabase foi recusada pela plataforma: a conta atingiu o limite de dois projetos gratuitos ativos ("NFe e Financeiro" e "qt-avaliacoes"). Pausar um deles ou fazer upgrade é decisão do Matheus. As migrações estão prontas em `supabase/migrations` e a semente em `supabase/seed`.
**Motivo.** Nada de infraestrutura de terceiros é alterado sem o dono decidir.

## D-020 · Massa de pizza só como produção

**Data.** 07/09/2026
**Decisão.** A massa entra como produção 219 (R$ 1,88/un, unidade de rendimento "un"); o insumo "Massa de pizza R$ 1,87/un" da seção 13.2 não é cadastrado.
**Motivo.** As fichas reais referenciam a produção 219; dois cadastros para a mesma coisa gerariam custo ambíguo.

## D-021 · Segunda-feira pertence à semana operacional seguinte

**Data.** 07/09/2026
**Decisão.** A semana operacional vai de terça a domingo. A segunda (fechada) é tratada como véspera da semana que começa na terça seguinte.
**Motivo.** A seção 9 coloca na segunda a contagem dos itens A, a escala da semana seguinte e a reunião semanal, todos preparatórios da semana que abre no dia seguinte.
