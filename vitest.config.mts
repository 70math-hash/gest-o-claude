import { defineConfig } from "vitest/config";
import path from "node:path";

// Testes unitários: motor de cálculo, formatação e importadores.
// Não tocam banco nem framework.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
