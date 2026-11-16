import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { chunkSizeWarningLimit: 1000 }, // the engine bundles the full workbook data (~0.6 MB)
  server: {
    port: 5173,
    // The website imports the Phase 2 engine from ../engine (unchanged), so allow the parent folder.
    fs: { allow: [path.resolve(here, "..")] },
  },
});
