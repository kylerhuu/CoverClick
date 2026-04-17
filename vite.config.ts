import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";

function copyManifest() {
  return {
    name: "copy-manifest",
    writeBundle() {
      const outDir = resolve(__dirname, "dist");
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(__dirname, "manifest.json"), resolve(outDir, "manifest.json"));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), copyManifest()],
  build: {
    outDir: "dist",
    emptyDirBeforeWrite: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
        background: resolve(__dirname, "src/background/serviceWorker.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    sourcemap: true,
  },
});
