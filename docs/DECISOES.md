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
