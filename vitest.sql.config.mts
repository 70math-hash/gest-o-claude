import { defineConfig } from "vitest/config";
import path from "node:path";

// Testes de consistência SQL: aplicam as migrações num Postgres local
// (DATABASE_URL) e comparam as views/funções com o motor TypeScript.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
