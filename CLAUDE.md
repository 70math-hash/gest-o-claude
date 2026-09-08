# QT GESTÃO

Sistema web de gestão e controladoria do QT Pizza Bar (Cerqueira César, São Paulo). Não é PDV: consome exportações do Altec Riser (R3 e vendas do dia) e do Santander, mais captura manual mobile-first, e calcula custo com rendimento, os dois CMV (Altec e corrigido), DRE gerencial vertical, gap de controle por base, indicadores de produção, gente, salão e canais, e engenharia de cardápio. Quatro perfis: dono, gestor, cozinha, salão. Especificação completa em `docs/ESPECIFICACAO.md` (fonte única de fórmulas: seção 5; testes de aceite: seção 11). Decisões fora da lista de perguntas ficam em `docs/DECISOES.md`, com data e motivo.

## Stack
Supabase (Postgres, Auth, Storage, RLS) com agregações em views e funções SQL, uma view por indicador. Next.js App Router, TypeScript, Tailwind, PWA para captura no celular. Motor de cálculo em módulos TypeScript puros, sem framework, testados com vitest contra os números da seção 11; as views SQL espelham os módulos e um teste de consistência compara os dois. Importadores CSV/XLSX (Altec R3, vendas do dia, extrato Santander) idempotentes por hash. Deploy em Vercel ou Netlify. Identidade QT: fundo #EFECEC, texto #1A1E1E, apoio #A0A5A5, Helvetica, números em monoespaçada, semáforo em tons de cinza e preto, sem cor vibrante, sombra ou degradê. Código em TypeScript; comentários e interface em português do Brasil.

## Regras invioláveis (seção 2)
1. É gestão, não PDV: o sistema não emite venda nem nota; recebe exportações e captura, calcula e mostra.
2. Cinco entradas, vendas é só a primeira: vendas, compras, inventário, produção e folha com despesas; cada uma destrava um bloco do painel.
3. Rendimento sempre: todo custo de ingrediente aplica rendimento; toda produção intermediária tem rendimento de batelada medido; cadastro sem rendimento não salva.
4. Nada é sobrescrito: preço de insumo, ficha e meta são temporais com vigência; custo numa data usa a ficha e o preço vigentes naquela data.
5. Mesma base: o gap compara CMV teórico e real de cozinha com cozinha e de bar com bar; nunca misturar bases.
6. Meta de CMV é teto, não alvo: abaixo da meta é ótimo; o sistema nunca sugere subir custo.
7. Toda métrica tem dono e fórmula: a seção 5 é a única fonte; o painel mostra a fórmula ao lado do número, num toque.
8. Captura em menos de 10 minutos por dia: telas mobile-first, mínimo de campos, padrões inteligentes, validação na hora.
9. Formato brasileiro em tudo: R$ 1.234,56, dd/mm/aaaa, percentual com vírgula, fuso America/Sao_Paulo, semana operacional de terça a domingo.
10. Zero número inventado: sem dado a tela mostra "sem dado" e o que falta lançar; nunca zero silencioso nem média disfarçada de medição.

## Estado das fases (seção 10)
Passo 1 da seção 0 concluído em 07/09/2026 (repositório, especificação, este arquivo, registro de decisões). Perguntas da seção 14 enviadas; nenhuma linha de código até as respostas.
- F0 Fundação: não iniciada (aguarda respostas da seção 14)
- F1 Produto: não iniciada
- F2 Processo: não iniciada
- F3 Gente: não iniciada
- F4 Controle: não iniciada
- F5 Crescimento: não iniciada
