#!/usr/bin/env bash
# Recria o banco local de testes e aplica as migrações e a semente.
# Uso: scripts/db_local.sh [nome_do_banco]
set -euo pipefail
DB="${1:-qt_gestao_teste}"
HOST="${PGHOST:-127.0.0.1}"
PORT="${PGPORT:-5433}"
USER="${PGUSER:-postgres}"
export PGOPTIONS='-c client_min_messages=warning'
psql -h "$HOST" -p "$PORT" -U "$USER" -d postgres -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q -c "create extension if not exists pgcrypto" -f supabase/tests/setup_local.sql
for f in supabase/migrations/*.sql; do
  echo "aplicando $f"
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done
if [ "${SEM_SEMENTE:-}" != "1" ]; then
  for f in supabase/seed/*.sql; do
    [ -e "$f" ] || continue
    echo "semeando $f"
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  done
fi
echo "banco $DB pronto"
