// Captura telas do app em modo local (PostgREST + Postgres locais) para
// conferência visual. Uso: CHROMIUM=/caminho/chrome FICHA_ID=uuid node scripts/capturas.mjs [urlBase]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const pasta = "docs/capturas";
mkdirSync(pasta, { recursive: true });
const paginas = [
  ["hoje", "/hoje?data=2026-05-15"],
  ["captura", "/captura"],
  ["fechamento", "/captura/fechamento?data=2026-05-15"],
  ["producao", "/captura/producao?data=2026-05-15"],
  ["batelada", "/captura/batelada?data=2026-05-15"],
  ["cronograma", "/captura/cronograma?data=2026-05-15"],
  ["checklist", "/captura/checklist?data=2026-05-15"],
  ["recebimento", "/captura/recebimento"],
  ["contagem", "/captura/contagem?tipo=geral&base=cozinha&data=2026-05-31"],
  ["salao", "/captura/salao?data=2026-05-15"],
  ["leitura", "/leitura"],
  ["semana", "/leitura/semana?data=2026-05-15"],
  ["mes", "/leitura/mes?mes=2026-05"],
  ["trimestre", "/leitura/trimestre?data=2026-05-31"],
  ["painel", "/leitura/painel?mes=2026-05"],
  ["canais", "/leitura/canais"],
  ["cadastro", "/cadastro"],
  ["insumos", "/cadastro/insumos"],
  ["fichas", "/cadastro/fichas"],
  ...(process.env.FICHA_ID ? [["ficha", `/cadastro/fichas/${process.env.FICHA_ID}`]] : []),
  ...(process.env.PRODUCAO_ID ? [["producao-detalhe", `/cadastro/producoes/${process.env.PRODUCAO_ID}`]] : []),
  ["parametros", "/cadastro/parametros"],
  ["importar", "/importar"],
];
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
for (const [largura, sufixo] of [[1280, ""], [390, "-celular"]]) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: largura === 390 ? 844 : 900 }, deviceScaleFactor: 1, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const pagina = await contexto.newPage();
  for (const [nome, caminho] of paginas) {
    if (largura === 390 && !["hoje", "fechamento", "producao", "cronograma", "contagem", "painel"].includes(nome)) continue;
    const resposta = await pagina.goto(base + caminho, { waitUntil: "networkidle", timeout: 120000 });
    const status = resposta?.status();
    await pagina.screenshot({ path: `${pasta}/${nome}${sufixo}.png`, fullPage: true });
    console.log(`${status} ${caminho} -> ${nome}${sufixo}.png`);
  }
  await contexto.close();
}
await navegador.close();
