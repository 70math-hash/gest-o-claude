# QT GESTÃO · Especificação e prompt de construção

Sistema de gestão e controladoria do QT Pizza Bar. Documento único que serve de prompt inicial e de especificação de referência para o Claude Code.

**Versão 1.0 · Setembro de 2026 · Matheus Ramos**

> Transcrição fiel do arquivo `QT-GESTAO-especificacao.pdf` (27 páginas), guardado nesta mesma pasta. As tabelas foram reconstruídas e as fórmulas colocadas em blocos de código; o texto é o do original. Em caso de dúvida de leitura, o PDF prevalece.

---

## 0. Prompt inicial (cole isto como primeira mensagem no Claude Code)

Você vai construir o QT GESTÃO, um sistema web de gestão e controladoria para um restaurante em São Paulo. Este documento é a especificação completa. Leia-o inteiro antes de escrever qualquer linha de código.

Faça, nesta ordem:

1. Crie o repositório e salve este documento em `docs/ESPECIFICACAO.md`. Crie um `CLAUDE.md` na raiz com um resumo de 30 linhas do que o sistema é, a stack, as regras invioláveis da seção 2 e o estado atual das fases. Atualize o `CLAUDE.md` ao fim de cada fase.
2. Antes de codar, faça as perguntas da seção 14 e espere as respostas. Tudo que não estiver nessa lista você decide sozinho e registra em `docs/DECISOES.md`, com data e motivo.
3. Construa em fases, F0 a F5, na ordem da seção 10. Cada fase só termina quando os testes automatizados passam, os critérios de aceite da fase são demonstrados com dados reais e o `CLAUDE.md` está atualizado. Não avance com a fase anterior aberta.
4. Todo cálculo do sistema deriva das fórmulas da seção 5, sem exceção. Se precisar de uma métrica que não está lá, pare e pergunte.
5. Os números de referência da seção 11 são testes de aceite. Escreva-os como testes automatizados na F1 e mantenha-os passando para sempre.
6. Escreva código em TypeScript, comentários e interface em português do Brasil, formatação brasileira de número e data em toda a interface, fuso America/Sao_Paulo.

Comece pelo passo 1 e depois faça as perguntas do passo 2.

---

## 1. Contexto do negócio

**A casa.** QT Pizza Bar, Cerqueira César, São Paulo. Pizzaria napolitana autoral, tamanho único de pizza, entre as 100 melhores do mundo pelo 50 Top Pizza desde 2022. Opera jantar, de terça a domingo, fechada na segunda. Tem salão, bar de drinks e delivery.

**Os sistemas atuais.** O ponto de venda e o cadastro de ficha técnica rodam no Altec Riser. O banco é o Santander. A taxa de serviço é de 13 por cento. Hoje a análise é feita com planilhas e scripts que leem exportações do Altec e do banco. O QT GESTÃO não substitui o Altec: ele consome exportações do Altec e adiciona a camada de gestão que o Altec não tem.

**O que o Altec não faz e o sistema precisa fazer.** O Altec calcula o custo do prato multiplicando gramagem por preço do insumo, sem aplicar rendimento. Isso subestima o custo de todo insumo que tem apara, casca, talo ou gordura descartada. O sistema precisa calcular os dois custos lado a lado, o do Altec e o corrigido por rendimento, e usar sempre o corrigido para decidir. O Altec também não versiona ficha, não compara custo teórico com custo real por estoque, não fecha DRE gerencial e não tem nenhum dos indicadores de processo e de gente.

**Os blocos do cardápio.** Pizzas, divididas nas seções Classiche, Non Così Classiche, Speciali e Queijos Brasileiros. Entradas. Sobremesas, todas a R$ 30,00. Bar, que são os drinks. Salão, que são vinhos, cervejas e não alcoólicos. Delivery. A categoria "Queijos Brasileiros" do Altec é tratada como pizza para todo cálculo de CMV.

**As metas de CMV.**

| BLOCO | META | TETO | OBSERVAÇÃO |
|---|---|---|---|
| Pizzas | até 23% | perto de 25% em dia de 2x1 | receita bruta nunca é descontada pelo 2x1; o custo das gratuitas soma ao custo base |
| Entradas | até 25% | 33% | acima de 25% o item entra em revisão |
| Sobremesas | até 15% | — | bloco de altíssima margem |
| Casa | até 30% | — | CMV total por estoque, comida e bebida juntas, como aparece no DRE |

**Pisos e tetos comerciais por seção de pizza.** Classiche de R$ 58 a R$ 150. Non Così Classiche de R$ 60 a R$ 110. Speciali de R$ 55 a R$ 120. Queijos Brasileiros de R$ 65 a R$ 80. Preço fora da faixa da seção gera alerta.

**Quem usa.** O dono, um gestor em formação, a cozinha nas telas de captura, o salão nas telas de reserva e atendimento. Quatro perfis de acesso: dono, gestor, cozinha, salão.

---

## 2. Princípios e regras invioláveis

1. **É gestão, não PDV.** O sistema não emite venda nem nota fiscal. Ele recebe exportações e captura manual, calcula e mostra.
2. **Cinco entradas, e vendas é só a primeira.** Vendas, compras, inventário, produção e folha com despesas. Cada entrada destrava um bloco do painel. A seção 12 diz o que é lançado à mão e quando.
3. **Rendimento sempre.** Todo custo de ingrediente aplica o rendimento do insumo. Toda produção intermediária tem rendimento de batelada medido. Cadastro sem rendimento não salva.
4. **Nada é sobrescrito.** Preço de insumo, ficha técnica e meta são temporais, com vigência. Custo de um prato numa data usa a versão da ficha e o preço vigentes naquela data. Sem isso não existe comparação entre meses.
5. **Mesma base.** Gap de controle compara CMV teórico de cozinha com CMV real de cozinha, e bar com bar. Nunca misturar bases.
6. **Meta de CMV é teto, não alvo.** Um bloco operar abaixo da meta é ótimo. O sistema nunca sugere subir custo para "chegar na meta".
7. **Toda métrica tem dono e fórmula.** A seção 5 é a única fonte de fórmulas. O painel mostra a fórmula ao lado do número, num toque.
8. **Captura em menos de 10 minutos por dia.** As telas de lançamento são mobile-first, com o mínimo de campos, valores padrão inteligentes e validação na hora.
9. **Formato brasileiro em tudo.** R$ 1.234,56, datas em dd/mm/aaaa, percentuais com vírgula, fuso America/Sao_Paulo, semana operacional de terça a domingo.
10. **Zero número inventado.** Onde não houver dado, a tela mostra "sem dado" e o que falta lançar. Nunca zero silencioso, nunca média disfarçada de medição.

---

## 3. Stack recomendada

Você tem liberdade técnica dentro destes limites.

- **Banco e autenticação:** Supabase (Postgres, Auth, Storage, Row Level Security). A conta já existe. Todas as agregações pesadas ficam em views e funções SQL para que qualquer ferramenta consiga ler o mesmo número.
- **Aplicação:** Next.js com App Router, TypeScript e Tailwind. Responsiva, instalável como PWA para as telas de captura no celular da cozinha.
- **Motor de cálculo:** as fórmulas da seção 5 implementadas em módulos TypeScript puros, sem dependência de framework, cobertos por testes unitários com os números da seção 11. As views SQL espelham esses módulos e um teste de consistência compara os dois.
- **Importadores:** parsers de CSV e XLSX do Altec e do Santander, com detecção de cabeçalho e normalização de número brasileiro. Toda importação é idempotente por hash do arquivo.
- **Testes:** vitest para unidade, testes de integração contra um Supabase local.
- **Deploy:** Vercel ou Netlify.
- **Identidade visual:** a da QT. Fundo branco #EFECEC, texto em preto #1A1E1E, apoio em cinza #A0A5A5, tipografia Helvetica ou equivalente do sistema, sem cor vibrante, sem sombra, sem degradê. Números sempre em fonte monoespaçada. Semáforo de indicador em três tons de cinza mais preto, nunca em verde e vermelho.

---

## 4. Modelo de dados

Nomes de tabela em português, snake_case. Toda tabela tem `id`, `criado_em`, `criado_por`, `atualizado_em`. Toda tabela de movimento tem `unidade_id` para permitir mais de uma casa no futuro, mesmo que hoje exista uma só.

### 4.1 Cadastro

| TABELA | CAMPOS PRINCIPAIS | REGRAS |
|---|---|---|
| `insumos` | nome, categoria, unidade_compra, unidade_uso, curva_abc, fornecedor_padrao_id, ativo | curva ABC recalculada por rotina semestral |
| `insumo_precos` | insumo_id, preco_por_unidade, rendimento_pct, vigencia_inicio, vigencia_fim, origem (cotacao, nota, manual) | temporal; nunca sobrescreve; rendimento entre 1 e 100 |
| `fornecedores` | nome, cnpj, contato, prazo_entrega_dias, homologado | item classe A exige 2 homologados |
| `producoes` | codigo_altec, nome, rendimento_declarado, unidade_rendimento, ativo | rendimento obrigatório; produção intermediária |
| `producao_itens` | producao_id, insumo_id ou producao_filha_id, quantidade, unidade | permite produção dentro de produção |
| `produtos` | id_altec, nome_altec, nome, bloco, secao, preco_venda, ativo, sazonal | bloco em pizza, entrada, sobremesa, bar, salao |
| `produto_precos` | produto_id, preco, vigencia_inicio, vigencia_fim | temporal |
| `secoes` | nome, bloco, piso, teto | pisos e tetos da seção 1 |
| `fichas` | produto_id, versao, vigencia_inicio, vigencia_fim, motivo, aprovado_por | versionada; alteração gera versão nova |
| `ficha_itens` | ficha_id, insumo_id ou producao_id, quantidade, unidade | gramagem pesada |
| `metas_cmv` | bloco, meta_pct, teto_pct, vigencia_inicio | seção 1 |
| `combos_2x1` | produto_gratuito_id, produto_pago_id, ativo | semente na seção 13 |
| `plano_contas` | grupo, nome, natureza (variavel, fixo, semifixo), dono | anexo B da apostila |
| `parametros` | cadeiras, mesas, horas_servico, dias_operacao, taxa_servico_pct, fator_seguranca_padrao, alerta_documento_dias | uma linha por unidade |
| `colaboradores` | nome, cargo, praca, admissao, desligamento, salario_base | |
| `processos_criticos` | nome, praca, pop_url, pop_versao | repositório de POP em Storage |
| `certificacoes` | colaborador_id, processo_id, nivel (1 a 4), data, avaliador_id | matriz de polivalência |
| `documentos_risco` | nome, tipo, vencimento, responsavel_id, alerta_dias | padrão 60 dias |
| `clientes` | nome, telefone, primeira_visita, ultima_visita, visitas | cadastro mínimo |

### 4.2 Movimento

| TABELA | CAMPOS PRINCIPAIS | REGRAS |
|---|---|---|
| `importacoes` | tipo (altec_r3, altec_dia, santander, comanda), arquivo, hash, periodo_inicio, periodo_fim, linhas, status | hash único; reimportação é rejeitada |
| `vendas_itens` | importacao_id, data, id_altec, produto_id, categoria_altec, qtde, vl_tabela, desc_prod, desc_global, val_bruto, total, canal | total é líquido de desconto; val_bruto é tabela cheia |
| `vendas_dia` | data, faturamento_bruto, taxa_servico, clientes, comandas, por_segmento (cozinha, salao, bar, delivery) | clientes pode vir de import ou de lançamento manual |
| `atendimentos` | data, mesa, comanda, clientes, chegada, saida, teve_entrada, teve_sobremesa, teve_bebida, garcom_id | alimenta attach e giro; vem de export por comanda ou de captura no salão |
| `compras` | data, fornecedor_id, nota_numero, total, conferido_por | |
| `compra_itens` | compra_id, insumo_id, quantidade, preco_unitario, temperatura_recebimento, validade | gera insumo_precos com origem nota |
| `inventarios` | data, tipo (rotativo, geral), base (cozinha, bar), responsavel_id, fechado | |
| `inventario_itens` | inventario_id, insumo_id, quantidade_contada, preco_vigente | valor calculado na data |
| `perdas` | data, insumo_id ou produto_id, quantidade, motivo (quebra, vencimento, erro, cortesia, degustacao, teste), responsavel_id, valor | cortesia e teste entram aqui |
| `producao_diaria` | data, producao_id ou produto_id, planejado, produzido, sobra, responsavel_id | |
| `bateladas` | data, producao_id, rendimento_real, rendimento_declarado_snapshot, responsavel_id | alimenta desvio de rendimento |
| `cronograma_etapas` | data, etapa, hora_inicio, hora_fim, responsavel_id, conferido_em, conferido_por | aderência |
| `checklists` | data, praca, tipo (abertura, fechamento), itens_json, assinado_por | |
| `escalas` | data, colaborador_id, entrada, saida, realizado_entrada, realizado_saida | horas trabalhadas e extras |
| `folha_mensal` | competencia, colaborador_id, salario, encargos, beneficios, horas_extras_valor | |
| `despesas` | competencia, data_caixa, conta_id, valor, descricao, origem (manual, santander) | |
| `conciliacao_dia` | data, vendas_sistema, recebido_adquirente, recebido_marketplace, recebido_pix_dinheiro, divergencia | divergencia é calculada |
| `reservas` | data, hora, mesa, pessoas, status (confirmada, compareceu, no_show, cancelada) | |
| `caixa_projecao` | semana_inicio, entradas_previstas, saidas_previstas, saldo_projetado | 13 semanas rolantes |

### 4.3 Views de leitura (SQL)

Uma view por indicador do painel, todas com os mesmos parâmetros de período e unidade:
`v_custo_ficha_vigente`, `v_cmv_teorico_item`, `v_cmv_ponderado_bloco`, `v_cmv_real_base`, `v_gap_controle`, `v_dre_vertical`, `v_ponto_equilibrio`, `v_prime_cost`, `v_aderencia_cronograma`, `v_desvio_rendimento`, `v_sobra`, `v_attach`, `v_giro`, `v_turnover`, `v_margem_canal`, `v_engenharia_cardapio`, `v_painel_unico`.

---

## 5. Motor de cálculo

Única fonte de fórmulas do sistema. Percentuais são armazenados como fração (0,23) e exibidos como percentual (23,0%). Onde a fórmula divide por um percentual, ela usa a fração.

### 5.1 Custo e CMV teórico

```
custo_ingrediente        = (quantidade_em_kg × preco_por_kg) / rendimento
custo_altec_ingrediente  = quantidade_em_kg × preco_por_kg          (sem rendimento, só para comparar)
custo_producao_por_kg    = soma(custo_ingredientes da batelada) / rendimento_declarado_kg
custo_ficha              = soma(custo_ingrediente) + soma(quantidade × custo_producao_por_kg)
                           usando ficha e preços vigentes na data do cálculo
cmv_teorico_item         = custo_ficha / preco_venda
cmv_altec_item           = custo_altec_ficha / preco_venda
distorcao_rendimento     = cmv_teorico_item − cmv_altec_item        (alerta se > 0,03)
cmv_ponderado_bloco      = soma(custo_ficha × qtde) / soma(total_liquido)
cmv_ponderado_tabela     = soma(custo_ficha × qtde) / soma(val_bruto)   (cardápio a preço cheio)
margem_contribuicao_item = preco_venda − custo_ficha − preco_venda × (imposto + taxa_pagamento)
margem_90d_item          = margem_contribuicao_item × qtde_90d
```

### 5.2 Dia com 2x1

```
custo_total   = custo das pizzas pagas + custo das pizzas gratuitas
receita_bruta = soma dos preços das pizzas pagas        (nunca descontar o 2x1 da receita)
cmv_2x1       = custo_total / receita_bruta
```

A gratuita é identificada por `combos_2x1` quando o combo é fixo, e por regra de desconto de 100 por cento na linha da venda quando o combo é livre. Se o arquivo não permitir identificar, o sistema pede confirmação manual das gratuitas do dia.

### 5.3 Precificação

```
preco_minimo   = custo_ficha / meta_cmv_bloco
preco_sugerido = arredondar para cima ao múltiplo de R$ 5,00 ≥ preco_minimo
verificar piso e teto da seção; fora da faixa gera alerta e não bloqueia
```

### 5.4 Estoque, CMV real e gap

```
cmv_real_reais   = estoque_inicial + compras_periodo − estoque_final     (por base: cozinha ou bar)
cmv_real_pct     = cmv_real_reais / receita_periodo_da_mesma_base
gap_controle     = cmv_real_pct − cmv_teorico_ponderado_pct               (mesma base, mesmo período)
ponto_pedido     = consumo_medio_diario × prazo_entrega_dias + estoque_seguranca
giro_estoque     = cmv_periodo / estoque_medio
cobertura_dias   = estoque_medio / cmv_diario
acuracidade      = itens cuja contagem bate com o sistema / itens contados
perda_pct_cmv    = valor_perdas / cmv_periodo
```

O gap é mensal e usa o inventário geral. O inventário rotativo semanal dos itens classe A gera um gap parcial, marcado como parcial na tela.

### 5.5 Produção

```
demanda_projetada = media de venda daquele dia da semana (últimas 8 a 12 semanas) × fator_sazonal
producao_sugerida = demanda_projetada × fator_seguranca − saldo_dia_anterior
   fator_seguranca padrão 1,05 a 1,10; item de alta variação 1,15
aderencia_cronograma = etapas conferidas dentro da janela / etapas do dia
desvio_rendimento    = (rendimento_real − rendimento_declarado) / rendimento_declarado
sobra_pct            = sobra / produzido
refugo_pct           = itens refeitos / itens produzidos
cobertura_pop        = processos com POP testado / processos críticos
redundancia          = certificados nível ≥ 2 por processo crítico     (mínimo 2)
```

### 5.6 Financeiro

```
receita_liquida        = receita_bruta − impostos − taxas_pagamento − comissoes_marketplace
margem_contribuicao    = receita_liquida − cmv − embalagem
mc_pct                 = margem_contribuicao / receita_bruta
custos_fixos           = soma das contas de natureza fixo e semifixo do período
resultado_operacional  = margem_contribuicao − custos_fixos          (antes de pró-labore e depreciação)
prime_cost_pct         = (cmv + folha_com_encargos) / receita_bruta
ponto_equilibrio_reais    = custos_fixos / mc_pct
ponto_equilibrio_clientes = ponto_equilibrio_reais / ticket_medio
ponto_equilibrio_por_dia  = ponto_equilibrio_clientes / dias_abertos
dia_de_virada             = primeiro dia do mês em que receita acumulada ≥ ponto_equilibrio_reais
margem_seguranca          = (receita − ponto_equilibrio_reais) / receita
ncg                       = estoque + contas_a_receber − contas_a_pagar
```

A análise vertical do DRE expressa toda linha como fração da receita bruta. A referência de estrutura está na seção 11.

### 5.7 Gente

```
folha_pct                 = folha_com_encargos / receita_bruta
receita_por_hora          = receita_dia / horas_trabalhadas_equipe
pratos_por_cozinheiro     = pratos_produzidos / cozinheiros_no_turno
receita_por_garcom        = receita_das_mesas_atendidas / garcons_no_turno
horas_extras_pct          = valor_horas_extras / folha_total
absenteismo               = faltas_nao_programadas / dias_escalados
turnover_dieese           = min(admissoes, desligamentos) / efetivo_medio          (padrão do sistema)
turnover_interno          = ((admissoes + desligamentos) / 2) / efetivo_medio      (exibido como alternativo)
tempo_medio_casa          = média de meses entre admissão e hoje ou desligamento
```

O sistema mostra qual fórmula de turnover está em uso e nunca compara direto com o número do setor, que a Abrasel publica sem fórmula.

### 5.8 Salão e receita

```
ticket_medio       = receita_bruta / clientes
giro_por_cadeira   = clientes_atendidos / cadeiras                 (já embute a ocupação)
giro_por_mesa      = atendimentos / mesas
taxa_ocupacao      = cadeiras_ocupadas / cadeiras                  (diagnóstico, nunca multiplicar pelo giro)
attach_entrada     = mesas com entrada / mesas atendidas
attach_sobremesa   = mesas com sobremesa / mesas atendidas
attach_bebida      = mesas com bebida / mesas atendidas
tempo_a_mesa       = saida − chegada
no_show            = reservas não comparecidas / reservas confirmadas
base_que_retorna   = clientes com mais de uma visita / clientes únicos
retencao_90d       = clientes novos que voltaram em 90 dias / clientes novos
```

Capacidade horária do forno é medida, nunca extrapolada: soma das quatro faixas de 15 minutos de uma hora cheia de pico. O pico de 15 minutos é guardado separado, para dimensionar.

### 5.9 Canais

```
mc_canal   = preco − preco × comissao − preco × taxa_pagamento − embalagem − entrega − custo_ficha
indice     = mc_canal / mc_salao
preco_equivalencia = (mc_salao + embalagem + custo_ficha + entrega) / (1 − comissao − taxa_pagamento)
entrega_de_virada  = custo de entrega acima do qual o plano em que a casa entrega perde para o plano em que a plataforma entrega
```

Parâmetros por canal ficam em cadastro editável: comissão, taxa de pagamento, embalagem, custo de entrega, mensalidade. Valores de partida em 2026: plano básico 12 por cento mais 3,2 por cento de pagamento; plano entrega 23 por cento mais 3,2 por cento; plano flex 24 por cento; Rappi com entrega da plataforma 27 por cento mais 3,5 por cento; embalagem R$ 3,00; entrega própria R$ 9,00.

### 5.10 Engenharia de cardápio

Rodar por bloco, com 90 dias de venda, nas duas matrizes e destacar itens que mudam de quadrante.

```
Kasavana-Smith (padrão)
  popularidade_alta = participacao_no_mix ≥ 0,70 × (1 / numero_de_itens_do_bloco)
  margem_alta       = margem_contribuicao_item ≥ margem_contribuicao_media_ponderada_do_bloco

Miller (a que a casa usa hoje)
  popularidade_alta = mesma regra
  margem_alta       = cmv_teorico_item ≤ cmv_ponderado_do_bloco

Quadrantes: estrela (alta, alta), cavalo de batalha (alta, baixa), quebra-cabeça (baixa, alta), abacaxi (baixa, baixa)
```

O fator 0,70 é parâmetro editável. O sistema registra qual matriz foi usada em cada decisão.

---

## 6. Importadores

### 6.1 Altec, relatório R3 "Vendas por Produto Detalhado"

- Arquivo XLSX ou CSV. As 12 primeiras linhas são cabeçalho institucional e devem ser puladas; detectar a linha de cabeçalho real procurando a coluna "Produto".
- Colunas, normalizadas: Categoria, ID, Produto, Qtde, Vl_Tabela, Desc_Prod, Desc_Global, Val_Bruto, Total, %_Total.
- Remover linhas de Subtotal e Total. Converter número brasileiro: 1.702,00 vira 1702.00.
- Categorias de interesse: PIZZAS, QUEIJOS BRASILEIROS (tratar como pizza), ENTRADAS, SOBREMESAS, e as de bar e salão. Categoria desconhecida vai para uma fila de classificação manual.
- Mapear produto pelo ID do Altec, que é mais confiável que o nome. Fallback por nome normalizado: remover acento (RUCOLA vira RÚCOLA, FANTASTICA vira FANTÁSTICA, ACIDA vira ÁCIDA) e remover sufixos operacionais como (ENTRADA), PIZZA e PAIOLZINHO. Item sem match vai para a fila de mapeamento e a importação fica pendente até resolver.
- Total já é líquido de descontos e é a base do CMV operacional. Val_Bruto é tabela cheia e é a base do CMV de cardápio.
- O R3 não traz comanda nem mesa. Attach e giro por mesa dependem do importador 6.2 ou da captura no salão.
- Período do arquivo é lido do cabeçalho; se ausente, o usuário informa. Hash do arquivo impede reimportação.

### 6.2 Altec, vendas do dia por segmento e colaborador

- Existe hoje um script que lê a exportação diária de vendas e entrega faturamento total com taxa de serviço, faturamento por segmento (cozinha, salão, bar, delivery), pratos vendidos, ticket médio, e receita por garçom e por barman a partir do código do colaborador no sistema. Pedir uma amostra desse arquivo e portar a lógica. Se existir exportação por comanda ou mesa, ela alimenta `atendimentos` e destrava attach e giro por mesa.

### 6.3 Santander, extrato CSV ou XLS

- Detectar automaticamente a primeira linha da tabela, ignorando metadados.
- Colunas: Data, Descrição ou Lançamento, Valor, Tipo (D ou C), Saldo.
- Débitos viram candidatos a despesas, com sugestão de conta do plano de contas por regra de texto aprendida das classificações anteriores. Nada é classificado sem confirmação humana na primeira vez que uma descrição aparece.
- Créditos de adquirente e marketplace alimentam `conciliacao_dia`.

### 6.4 Cadastro inicial

- Importar insumos, produções e fichas a partir de planilha ou export do Altec, com relatório de inconsistência: produção sem rendimento, gramagem suspeita, insumo sem preço, preço sem data.

A seção 13 traz a semente mínima para o sistema rodar no primeiro dia.

---

## 7. Telas, organizadas pelos rituais da casa

O sistema é organizado pelo momento em que a pessoa usa, não por módulo. Cada ritual é uma tela ou um grupo curto de telas.

### 7.1 Captura, mobile-first

| TELA | QUEM | O QUE ENTRA | TEMPO ALVO |
|---|---|---|---|
| Fechamento do dia | gestor | upload ou colagem do export do Altec; número de clientes e comandas se não vier no arquivo; os quatro números da conciliação; perdas, cortesias e degustações; ocorrência do serviço | 5 min |
| Produção do dia | cozinha | para cada produção ou item do mapa de mise: planejado (sugerido pelo sistema), produzido, sobra | 3 min |
| Batelada | cozinha | produção, rendimento real pesado; o sistema mostra o declarado e o desvio na hora | 30 s |
| Cronograma | cozinha | lista das etapas do dia com hora prevista, botão conferido, responsável | 10 s por etapa |
| Checklist de praça | cozinha | abertura e fechamento, assinado | 2 min |
| Recebimento | cozinha ou gestor | fornecedor, nota, itens com quantidade, preço, temperatura e validade; gera preço vigente | 3 min por nota |
| Contagem | cozinha ou gestor | inventário rotativo dos itens classe A (semanal) ou geral (mensal), com o último preço vigente, offline-first | 15 min ou 60 min |
| Reservas e salão | salão | reservas com status, e por atendimento: mesa, clientes, chegada, saída, teve entrada, sobremesa, bebida | por atendimento |
| Documento de risco | gestor | nome, tipo, vencimento, responsável | 1 min |

### 7.2 Leitura

| TELA | RITUAL | CONTEÚDO |
|---|---|---|
| Pré-serviço | diário, 10 min | itens indisponíveis, reservas e mesas grandes, ponto de padrão do dia, meta de clientes do dia |
| Painel do dia | fechamento diário | faturamento total com taxa de serviço, por segmento, clientes, ticket médio, pratos por cozinheiro, receita por garçom e por barman, divergência de conciliação, comparação com o mesmo dia da semana anterior |
| Semana | reunião semanal | CMV ponderado por bloco contra meta, gap parcial dos itens A, aderência ao cronograma, desvio de rendimento, sobra, ranking de pratos, attach, escala da semana seguinte contra a curva, POP auditado |
| Mês | fechamento mensal | DRE gerencial vertical com desvio contra orçamento, CMV real por base, gap de controle com decomposição, prime cost, ponto de equilíbrio e dia de virada, margem de segurança, folha, produtividade, horas extras, turnover, caixa 13 semanas, feedback |
| Trimestre | revisão trimestral | engenharia de cardápio nas duas matrizes, itens que mudam de quadrante, recotação dos itens A com impacto nas fichas, revisão de preço com piso e teto, avaliação e certificações, calendário de risco dos próximos 90 dias |
| Painel único | qualquer dia | todos os indicadores da apostila, com fórmula, origem, frequência, meta e semáforo, e o que falta lançar para cada um que estiver sem dado |
| Canais | sob demanda | tabela de margem por canal com parâmetros editáveis, entrega de virada, preço de equivalência |

### 7.3 Cadastro

Insumos com histórico de preço e rendimento. Produções com rendimento e custo por quilo. Fichas com versões, diferença de custo e de CMV entre versões, e foto do padrão. Produtos com preço, seção, piso e teto. Metas. Combos 2x1. Plano de contas. Colaboradores, escalas, certificações e matriz de polivalência. Processos críticos com POP em arquivo. Fornecedores. Documentos de risco. Parâmetros da casa.

---

## 8. Validações e alertas

Regras que o sistema aplica sozinho. Bloqueio impede salvar. Alerta salva e sinaliza.

| SITUAÇÃO | AÇÃO |
|---|---|
| Produção intermediária sem rendimento declarado | bloqueio |
| Gramagem por porção acima de 1 kg ou abaixo de 0,5 g | pede confirmação, provável erro de vírgula |
| Custo por quilo de uma produção mais de 50% acima ou abaixo do insumo equivalente | alerta |
| Ficha alterada sem motivo e sem versão nova | bloqueio |
| Distorção entre CMV com e sem rendimento acima de 3 pontos em um item | alerta, mostrar o insumo responsável |
| Insumo classe A com menos de 2 fornecedores homologados | alerta |
| Preço de venda fora do piso ou teto da seção | alerta |
| Item acima da meta de CMV do bloco | alerta semanal; entrada acima de 33% é alerta crítico |
| Gap de controle acima de 2 pontos | alerta mensal com sugestão de decomposição: porcionamento, perda não registrada, cortesia não lançada, erro de contagem |
| Aderência ao cronograma abaixo de 95% na semana | alerta com as etapas atrasadas |
| Desvio de rendimento acima de 3% em uma batelada | alerta |
| Sobra acima de 5% em um item por três dias | alerta com sugestão de novo fator de segurança |
| Divergência de conciliação diferente de zero | alerta no mesmo dia |
| Arquivo já importado (mesmo hash) | bloqueio |
| Item do arquivo sem mapeamento | importação pendente até resolver |
| Processo crítico com menos de 2 certificados | alerta |
| Horas extras acima de 5% da folha no mês | alerta |
| Documento de risco vencendo em 60 dias ou menos | alerta; vencido é destaque permanente |
| Indicador sem dado no período | mostrar "sem dado" e listar o lançamento que falta, nunca zero |

---

## 9. Agenda de lançamento e leitura

A semana operacional começa na terça. O sistema abre a tela certa no momento certo.

| QUANDO | O QUE | QUEM |
|---|---|---|
| Todo dia de operação, antes de abrir | pré-serviço | gestor |
| Todo dia de operação, ao fechar | fechamento do dia, produção do dia, conferido do cronograma | gestor e cozinha |
| Toda batelada | rendimento real | cozinha |
| Toda entrega de insumo | recebimento | cozinha ou gestor |
| Semanal, na segunda | contagem rotativa dos itens A, escala da semana seguinte, reunião semanal | gestor |
| Mensal, até o dia 10 | inventário geral, folha, despesas, DRE, caixa 13 semanas | gestor |
| Trimestral | engenharia de cardápio, recotação, preços, avaliações, calendário de risco | gestor e dono |

---

## 10. Fases de construção

Cada fase termina com testes passando, aceite demonstrado com dados reais e `CLAUDE.md` atualizado.

**F0 · Fundação.** Repositório, Supabase com schema da seção 4, autenticação e os quatro perfis, parâmetros da casa, plano de contas, identidade visual, importador R3 com a semente de mapeamento da seção 13. Aceite: subir um R3 real e ver faturamento, ranking por bloco e a fila de itens sem mapeamento vazia.

**F1 · Produto.** Insumos com preço e rendimento temporais, produções com rendimento, fichas versionadas com diferença entre versões, cálculo de custo e dos dois CMV, precificação com piso e teto, metas, combos 2x1 e a regra do dia com 2x1. Aceite: todos os testes da seção 11.1 a 11.4 passando, e o CMV ponderado por bloco de um R3 real calculado e exibido contra a meta.

**F2 · Processo.** Produção diária com sugestão, bateladas, cronograma com conferido, checklists, repositório de POP com versão. Aceite: aderência, desvio de rendimento e sobra calculando sobre uma semana real de lançamentos.

**F3 · Gente.** Colaboradores, escalas com realizado, certificações e matriz de polivalência, folha mensal, produtividade nas três leituras, turnover nas duas fórmulas, horas extras. Aceite: painel de gente do mês com todos os indicadores e o alerta de redundância funcionando.

**F4 · Controle.** Compras com geração de preço vigente, inventário rotativo e geral, perdas, CMV real por base, gap com decomposição, conciliação diária, despesas com importador Santander, DRE vertical com orçamento, ponto de equilíbrio e dia de virada, caixa 13 semanas, calendário de risco, painel único. Aceite: um mês fechado de ponta a ponta, DRE fechado até o dia 10, gap calculado na mesma base, testes 11.5 e 11.6 passando.

**F5 · Crescimento.** Canais com parâmetros editáveis, entrega de virada e preço de equivalência, reservas e no-show, atendimentos com attach e giro, clientes e retenção, engenharia de cardápio nas duas matrizes com histórico de decisão. Aceite: testes 11.7 e 11.8 passando e uma rodada de engenharia feita sobre 90 dias reais.

---

## 11. Testes de aceite com números de referência

Os números vêm de fichas reais da casa, de abril de 2026. Servem como fixtures. Tolerância de R$ 0,01 e de 0,1 ponto percentual.

### 11.1 Custo de ingrediente com rendimento

| INSUMO | QUANTIDADE | PREÇO | RENDIMENTO | CUSTO ESPERADO |
|---|---|---|---|---|
| Grana padano | 20 g | R$ 115,25/kg | 88% | R$ 2,62 |
| Fior di latte | 90 g | R$ 65,00/kg | 100% | R$ 5,85 |
| Par fior + grana | | | | R$ 8,47 |
| Manjericão italiano | 10 g | R$ 299,00/kg | 60% | R$ 4,98 |

O manjericão a R$ 2,99 pelo custo Altec, sem rendimento, e R$ 4,98 pelo custo real é a demonstração canônica da distorção.

### 11.2 Produção intermediária e rendimento de batelada

| PRODUÇÃO | CUSTO DA BATELADA | RENDIMENTO | CUSTO POR KG |
|---|---|---|---|
| Tortano | R$ 95,25 | 2,2 kg | R$ 43,30 |
| Creme de abobrinha | | 2,1 kg | R$ 9,73 |

Pão de Calabresa: 350 g de tortano a R$ 43,30/kg dá R$ 15,16, mais 100 g de molho de queijo a R$ 9,95/kg dá R$ 1,00, total R$ 16,15, que a R$ 65,00 dá CMV de 24,8%. Antes da correção, com o rendimento da batelada não cadastrado, o Altec mostrava R$ 108,79/kg e CMV de 60,1%, um erro de 251%. O sistema deve reproduzir o número correto e bloquear o cadastro sem rendimento.

### 11.3 CMV de prato, com e sem rendimento

| ITEM | CUSTO | PREÇO | CMV ALTEC | CMV REAL |
|---|---|---|---|---|
| Pomodori | R$ 15,77 | R$ 75,00 | 21,0% | 21,0% |
| Salada Caprese | R$ 11,90 | R$ 45,00 | 26,4% | 32,5% |
| Fritto di Bufala | R$ 23,30 | R$ 65,00 | 35,8% | 37,4% |

Preço mínimo para CMV alvo: custo R$ 19,55 com alvo de 23% dá R$ 85,00.

### 11.4 Dia com 2x1

Receita bruta R$ 1.442,00, custo das pagas R$ 301,53, custo das gratuitas R$ 85,19, custo total R$ 386,72, CMV de 26,82%.

### 11.5 DRE de referência e prime cost

Receita 100. Impostos 9,0 e taxas 3,5 levam a receita líquida de 87,5. CMV 28,0 leva a margem de contribuição de 59,5. Folha 28,0, ocupação 9,0, utilidades 4,0, operacional 7,0 e marketing 3,0 somam 51,0. Resultado operacional 8,5. Prime cost 56,0. Se o CMV for a 32 e a folha a 30, prime cost 62 e resultado 2,5.

### 11.6 Ponto de equilíbrio

Receita R$ 400.000,00, custos variáveis R$ 162.000,00, custos fixos R$ 204.000,00, ticket médio R$ 180,00, 26 dias abertos, lucro alvo R$ 50.000,00. Margem de contribuição R$ 238.000,00 e 59,5%. Ponto de equilíbrio R$ 342.857,14, ou 1.904,8 clientes, ou 73,3 clientes por dia. Margem de segurança 14,29%. Receita para o lucro alvo R$ 426.890,76, ou 2.371,6 clientes.

### 11.7 Margem por canal

Pizza R$ 75,00, insumo R$ 15,77, taxa de pagamento 3,2%, embalagem R$ 3,00, entrega própria R$ 9,00.

| CANAL | COMISSÃO | MARGEM | ÍNDICE |
|---|---|---|---|
| Salão | 0% | R$ 56,83 | 100 |
| Canal próprio, casa entrega | 0% | R$ 44,83 | 79 |
| Marketplace básico, casa entrega | 12% | R$ 35,83 | 63 |
| Marketplace entrega da plataforma | 23% | R$ 36,58 | 64 |
| Marketplace 27% mais 3,5% | 27% | R$ 33,36 | 59 |

Entrega de virada R$ 8,25. Preço de equivalência do plano de 23% mais 3,2%: R$ 102,44.

### 11.8 Engenharia de cardápio, entradas, primeiro trimestre de 2026

422 unidades vendidas em 9 itens. Piso de popularidade Kasavana-Smith: 0,70 × 422 / 9 = 32,8 unidades. CMV ponderado do bloco 22,2%. Pela matriz de Miller: Sticks com 113 unidades e CMV 16,0% é estrela; Arancini 59 unidades e 9,7% é estrela; Carpaccio 54 unidades e 25,4% é cavalo de batalha; Fritto di Bufala 54 unidades e 37,4% é cavalo de batalha; Caprese 11 unidades e 32,5% é abacaxi; Pão de Calabresa 17 unidades e 24,8% é abacaxi por popularidade.

### 11.9 Attach de sobremesa

Custo médio R$ 2,83, preço R$ 30,00, imposto 9% e cartão 3,5%: margem de contribuição R$ 23,42. Em 40 mesas, subir o attach de 20% para 30% são 4 mesas a mais, R$ 93,68 por noite, R$ 2.436,00 em 26 noites, R$ 29.228,00 em 12 meses.

---

## 12. O que é lançado à mão, e quanto tempo leva

O sistema é desenhado para que a captura manual caiba em dez minutos por dia.

**Diário, no fechamento.** Upload do export do Altec ou colagem do texto. Número de clientes e comandas, se o arquivo não trouxer. Os quatro números da conciliação: vendas do sistema, recebido em adquirente, recebido em marketplace, recebido em pix e dinheiro. Perdas, cortesias, degustações e testes do dia. Produzido e sobra por item do mapa de mise. Conferido das etapas do cronograma. Uma linha de ocorrência.

**Por evento.** Rendimento real de cada batelada, na balança. Recebimento de cada nota, com peso, temperatura e validade.

**Semanal, na segunda.** Contagem dos itens classe A, em torno de 20 itens. Escala da semana seguinte. Recotação quando houver.

**Mensal, até o dia 10.** Inventário geral. Folha do mês. Despesas, por importação do extrato mais classificação. Orçamento, quando mudar.

**Trimestral.** Avaliações de equipe. Revisão de preço. Confirmação das decisões de engenharia de cardápio.

---

## 13. Dados de semente

Semente mínima para o sistema rodar no primeiro dia. Valores de abril de 2026, a revisar no cadastro. Custos são da ficha vigente e já aplicam rendimento.

### 13.1 Produtos, mapeamento Altec, bloco, custo e preço

| ID ALTEC | NOME NO ALTEC | NOME | BLOCO | SEÇÃO | CUSTO | PREÇO |
|---|---|---|---|---|---|---|
| 100010 | MARINARA | Marinara | pizza | Classiche | 11,47 | 58 |
| 100011 | MARGHERITA | Margherita | pizza | Classiche | 11,28 | 62 |
| 100012 | RUCOLA | Rúcola | pizza | Non Così Classiche | 23,64 | 75 |
| 100013 | BIANCA | Bianca | pizza | Classiche | 14,42 | 70 |
| 100015 | BURRATA PIZZA | Burrata | pizza | Classiche | 35,91 | 130 |
| 100016 | TRUFADA | Trufada | pizza | Speciali | 18,39 | 95 |
| 100017 | ABOBRINHA | Abobrinha | pizza | Speciali | 12,01 | 89 |
| 100018 | ZUCCA | Zucca | pizza | Speciali | 2,97 | 55 |
| 100019 | COG PORC | Cog Porc | pizza | Non Così Classiche | 16,73 | 68 |
| 100020 | CALABRESA | Calabresa | pizza | Classiche | 13,08 | 68 |
| 100021 | CATU | Catu | pizza | Non Così Classiche | 15,46 | 70 |
| 100022 | MORTADELA | Mortadela | pizza | Non Così Classiche | 16,63 | 72 |
| 100153 | CARBONARA | Carbonara | pizza | Non Così Classiche | 16,38 | 82 |
| 100157 | MELADO | Melado | pizza | Speciali | 16,28 | 79 |
| 100188 | QUEIJIN | Queijin | pizza | Non Così Classiche | 11,02 | 70 |
| 100190 | FANTASTICA | Fantástica | pizza | Speciali | 17,10 | 95 |
| 100195 | COSACCA | Cosacca | pizza | Classiche | 13,18 | 60 |
| 100201 | BLUE CHEESE | Blue Cheese | pizza | Non Così Classiche | 16,62 | 65 |
| 100204 | FRANGO COM AÇAFRÃO | Frango com Açafrão | pizza | Speciali | 9,37 | 75 |
| 100205 | DIAVOLETE | Diavolete | pizza | Speciali | 14,49 | 95 |
| 100258 | PASTRAMI | Pastrami | pizza | Speciali | 11,66 | 78 |
| 100275 | BRASILEIRITA | Brasileirita | pizza | Classiche | 12,29 | 62 |
| 100276 | PORPETTA | Porpetta | pizza | Non Così Classiche | 12,50 | 70 |
| 120019 | POMODORI | Pomodori | pizza | Speciali | 15,77 | 75 |
| 100259 | DOCE PAIOLZINHO | Doce (QB) | pizza | Queijos Brasileiros | 13,00 | 70 |
| 100260 | PIZZA UMAMI | Umami (QB) | pizza | Queijos Brasileiros | 13,00 | 70 |
| 100261 | PIZZA SALGADA | Salgada (QB) | pizza | Queijos Brasileiros | 13,00 | 70 |
| 100262 | PIZZA ACIDA | Ácida (QB) | pizza | Queijos Brasileiros | 13,00 | 70 |
| 100263 | PIZZA AMARGA | Amarga (QB) | pizza | Queijos Brasileiros | 13,00 | 70 |
| sazonal | OVO | Ovo | pizza | Speciali | 17,99 | 71 |
| 100001 | SALADA CAPRESE | Salada Caprese | entrada | | 11,90 | 45 |
| 100002 | ARANCINI | Arancini | entrada | | 6,66 | 69 |
| 100004 | BURRATA (ENTRADA) | Burrata | entrada | | 27,35 | 90 |
| 100005 | STICKS (ENTRADA) | Sticks | entrada | | 5,72 | 40 |
| 100007 | PÃO DA CASA | Pão da Casa | entrada | | 13,60 | 69 |
| 100009 | TABUA DE BRUSCHETTA | Tábua de Bruschetta | entrada | | 6,99 | 59 |
| 100179 | FRITTO DI BUFALA | Fritto di Bufala | entrada | | 23,30 | 65 |
| confirmar | CARPACCIO | Carpaccio | entrada | | 14,22 | 59 |
| confirmar | PÃO DE CALABRESA | Pão de Calabresa | entrada | | 16,15 | 65 |
| 120056 | QTMISU 2.0 | QTmisu 2.0 | sobremesa | | 5,34 | 30 |
| 120057 | PIZZA FRITA ROMEU E JULIETA | Pizza Frita Romeu e Julieta | sobremesa | | 0,98 | 30 |
| 120059 | TARTELETTE CARTOLA | Tartelette Cartola | sobremesa | | 0,98 | 30 |
| 120060 | CHOCOLATE, AZEITE E FLOR DE SAL | Chocolate, Azeite e Flor de Sal | sobremesa | | 4,58 | 30 |
| confirmar | MORANGO E MANJERICÃO | Morango e Manjericão | sobremesa | | 2,29 | 30 |

### 13.2 Insumos com rendimento, amostra

| INSUMO | PREÇO | RENDIMENTO | CUSTO EFETIVO |
|---|---|---|---|
| Fior di latte | R$ 65,00/kg | 100% | R$ 65,00 |
| Grana padano 12 meses | R$ 115,25/kg | 88% | R$ 130,97 |
| Mozzarella de búfala | R$ 45,35/kg | 92% | R$ 49,29 |
| Molho San Marzano | R$ 68,67/kg | 88% | R$ 78,04 |
| Massa de pizza | R$ 1,87/un | 100% | R$ 1,87 |
| Manjericão italiano | R$ 299,00/kg | 60% | R$ 498,33 |
| Calabresa | R$ 73,12/kg | 70% | R$ 104,46 |
| Rúcula selvagem | R$ 242,10/kg | 85% | R$ 284,82 |
| Azeite | R$ 55,00/L | 88% | R$ 62,50 |
| Catupiry | R$ 41,99/kg | 82% | R$ 51,21 |
| Speck | R$ 324,46/kg | 100% | R$ 324,46 |
| Mel trufado | R$ 349,50/kg | 90% | R$ 388,33 |
| Tomate italiano | R$ 9,90/kg | 70% | R$ 14,14 |
| Farinha Superiore | R$ 12,75/kg | 88% | R$ 14,49 |
| Gorgonzola | R$ 175,00/kg | 92% | R$ 190,22 |

A mozzarella de búfala tem três preços no Altec, R$ 45,35, R$ 65,09 e R$ 62,65 por quilo, conforme o uso. Manter os três até a consolidação do cadastro, com vigência e origem.

### 13.3 Produções intermediárias, amostra

| CÓDIGO | PRODUÇÃO | RENDIMENTO | CUSTO POR KG | USA EM |
|---|---|---|---|---|
| 298 | Tortano | 2,2 kg | R$ 43,30 | Pão de Calabresa |
| 254 | Creme de abobrinha | 2,1 kg | R$ 9,73 | Abobrinha, Ácida, Amarga |
| 219 | Massa de pizza | por unidade | R$ 1,88/un | Sticks, Pão da Casa, Romeu e Julieta |
| 218 | Tomate San Marzano | | R$ 68,57 | Sticks, Fritto di Bufala |
| 272 | Focaccia | | R$ 16,82 | Carpaccio, Burrata, Chocolate e Flor de Sal |
| 273 | Pesto de manjericão | | R$ 10,73 | Caprese, Carpaccio, Bruschetta |
| 256 | Fondue | | R$ 53,60 | Pão da Casa, Bruschetta |
| 268 | Arancini | | R$ 36,52 | Arancini |
| 120122 | Mousse de chocolate | | R$ 70,56 | Chocolate, Azeite e Flor de Sal |
| 120123 | Creme coalhada de ovelha | | R$ 67,17 | QTmisu 2.0 |

As produções sem rendimento nesta tabela precisam do rendimento medido antes do cadastro, pela regra da seção 8.

### 13.4 Combos 2x1 fixos

| GRATUITA | PAGA | CUSTO DA GRATUITA |
|---|---|---|
| Zucca | Fantástica | R$ 2,97 |
| Marinara | Diavolete | R$ 11,47 |
| Brasileirita | Pastrami | R$ 12,29 |

### 13.5 Parâmetros iniciais

Dias de operação de terça a domingo. Taxa de serviço 13%. Escala padrão de jantar com 4 cozinheiros. Fator de segurança padrão 1,10. Alerta de documento 60 dias. Fator de popularidade 0,70. Imposto sobre venda e taxa de pagamento a preencher no cadastro.

---

## 14. Perguntas a fazer antes de começar

1. Confirma Supabase como banco e Next.js como aplicação, ou prefere outra stack dentro dos limites da seção 3?
2. Envie uma amostra real do R3 do Altec, uma amostra da exportação diária de vendas por segmento e colaborador, e uma amostra do extrato Santander.
3. O Altec exporta vendas por comanda ou por mesa? Se sim, envie uma amostra. Se não, o attach será capturado no salão.
4. Envie o export atual de insumos, produções e fichas do Altec, ou a planilha que faz esse papel hoje.
5. Quem são os usuários iniciais em cada perfil, com e-mail.
6. Imposto sobre venda e taxa média de pagamento a usar no cadastro de parâmetros.
7. Existe capacidade de forno medida? Se sim, informe pizzas por hora cheia de pico e o pico de 15 minutos.

Tudo o mais você decide e registra em `docs/DECISOES.md`.

---

## 15. Fora de escopo na primeira versão

Emissão fiscal. Ponto de venda. Integração direta com a API do Altec, que hoje é só importação de arquivo. Aplicativo nativo. Múltiplas unidades, apenas modeladas por `unidade_id`. Previsão de demanda por aprendizado de máquina. Integração bancária automática além da importação de extrato. Controle de conformidade sanitária além do calendário de documentos e do repositório de POP.

---

## 16. Glossário

**CMV.** Custo da mercadoria vendida, custo de insumo sobre a receita. **Rendimento.** Fração do insumo comprado que chega ao prato. **Ficha técnica.** Receita com gramagem pesada e custo. **Produção intermediária.** Preparo feito na casa que entra em outros pratos, custeado por batelada. **Gap de controle.** Diferença entre o CMV real por estoque e o CMV teórico das fichas. **Prime cost.** CMV mais folha com encargos. **Margem de contribuição.** O que sobra da venda depois dos custos variáveis. **Ponto de equilíbrio.** Receita que zera o resultado. **Attach.** Fração das mesas que pediu uma categoria. **Giro.** Quantas vezes uma cadeira ou mesa foi usada por serviço. **POP.** Procedimento operacional padrão. **PVPS.** Primeiro que vence, primeiro que sai. **Kasavana-Smith.** Matriz de engenharia de cardápio por popularidade e margem de contribuição. **Miller.** A mesma matriz com o eixo de custo percentual. **R3.** Relatório do Altec de vendas por produto detalhado.
