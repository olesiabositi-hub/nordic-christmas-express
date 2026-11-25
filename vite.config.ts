import { defineConfig } from "vite";
// base "./": сборка открывается из любой папки (GitHub Pages, GitLab Pages, артефакт).
export default defineConfig({
  base: "./",
  build: { target: "es2020", chunkSizeWarningLimit: 1200, assetsInlineLimit: 0 },
  test: { environment: "node" },
} as never);
