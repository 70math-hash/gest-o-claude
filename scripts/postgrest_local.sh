#!/usr/bin/env bash
# Sobe um PostgREST local sobre o Postgres de testes, com JWT fixo do dono.
# Uso: scripts/postgrest_local.sh [start|stop|jwt]
set -euo pipefail
DIR="${POSTGREST_DIR:-/tmp/claude-0/-home-user-gest-o-claude/f4fae3b7-bb17-5db2-a4f2-1eb4d3bf1e85/scratchpad}"
SEGREDO="${LOCAL_JWT_SECRET:-qt-gestao-segredo-local-de-desenvolvimento-com-32-chars}"
USUARIO="00000000-0000-0000-0000-00000000aa01"
jwt() {
  node -e '
    const c = require("crypto");
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const h = b({ alg: "HS256", typ: "JWT" });
    const p = b({ sub: process.argv[1], role: "authenticated", aud: "authenticated", email: "70math@gmail.com", exp: 4102444800 });
    const s = c.createHmac("sha256", process.argv[2]).update(`${h}.${p}`).digest("base64url");
    console.log(`${h}.${p}.${s}`);
  ' "$USUARIO" "$SEGREDO"
}
case "${1:-start}" in
  jwt) jwt ;;
  stop) pkill -f "postgrest $DIR/postgrest.conf" || true ;;
  start)
    cat > "$DIR/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@127.0.0.1:5433/${DB_LOCAL:-qt_gestao_teste}"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SEGREDO"
server-host = "127.0.0.1"
server-port = 3001
CONF
    pkill -f "postgrest $DIR/postgrest.conf" || true
    nohup "$DIR/postgrest" "$DIR/postgrest.conf" > "$DIR/postgrest.log" 2>&1 &
    sleep 1.5
    echo "PostgREST em http://127.0.0.1:3001 (log em $DIR/postgrest.log)"
    ;;
esac
