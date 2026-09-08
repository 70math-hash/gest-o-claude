# QT GESTÃO

Sistema web de gestão e controladoria do QT Pizza Bar, em São Paulo.

- `CLAUDE.md`: resumo do sistema, stack, regras invioláveis e estado das fases.
- `docs/ESPECIFICACAO.md`: especificação completa (transcrição do PDF `docs/QT-GESTAO-especificacao.pdf`).
- `docs/DECISOES.md`: decisões de projeto tomadas sem consulta, com data e motivo.

## Estrutura

- `src/motor`: fórmulas da seção 5 em TypeScript puro, com os testes de aceite da seção 11.
- `src/formato`: formatação brasileira (R$, datas, percentuais, semana operacional, fuso).
- `src/importadores`: leitores de R3, venda do dia, extrato Santander, comanda e cadastro inicial.
- `src/app`: Next.js App Router, telas organizadas pelos rituais (hoje, captura, leitura, cadastro, importar).
- `supabase/migrations`: schema da seção 4, funções SQL dos indicadores (views da seção 4.3) e RLS.
- `supabase/seed`: semente da seção 13 com as fichas reais de abril de 2026.
- `supabase/tests`: consistência entre as funções SQL e o motor TypeScript.

## Rodar

```bash
pnpm install
pnpm test          # motor, formato e importadores
pnpm typecheck
```

Testes SQL e app em modo local (Postgres 16 na porta 5433 e PostgREST na 3001):

```bash
bash scripts/db_local.sh          # recria o banco com migrações e semente
pnpm test:sql                     # consistência SQL × motor
bash scripts/postgrest_local.sh   # sobe o PostgREST e imprime o JWT
cp .env.example .env.local        # e ajuste MODO_LOCAL=1, LOCAL_JWT, URL local
pnpm dev
```

Produção: projeto Supabase `qt-gestao` com as migrações de `supabase/migrations` e a semente de `supabase/seed`; variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; deploy em Netlify ou Vercel.
