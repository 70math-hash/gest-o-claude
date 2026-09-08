import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // O XLSX (SheetJS) é usado só no servidor, nas importações.
  serverExternalPackages: ["xlsx"],
};

export default config;
