import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";

function copyManifest() {
  return {
    name: "copy-manifest",
    writeBundle() {
      const outDir = resolve(__dirname, "dist");
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(__dirname, "manifest.json"), resolve(outDir, "manifest.json"));
      const iconsSrc = resolve(__dirname, "icons");
      if (existsSync(iconsSrc)) {
        const iconsOut = resolve(outDir, "icons");
        mkdirSync(iconsOut, { recursive: true });
        for (const name of readdirSync(iconsSrc)) {
          copyFileSync(resolve(iconsSrc, name), resolve(iconsOut, name));
        }
      }
    },
  };
}

/**
 * After the main app bundle (which clears `dist/`), produce `dist/content.js` from
 * `vite.content.config.ts` so a single `vite build` always leaves manifest paths valid.
 * Skipped in watch mode — use `npm run dev` (runs app + content watchers in parallel).
 */
function buildContentScript(): Plugin {
  return {
    name: "build-content-script",
    apply: "build",
    async closeBundle() {
      if (process.argv.includes("--watch")) return;
      const { build } = await import("vite");
      await build({
        configFile: resolve(__dirname, "vite.content.config.ts"),
        logLevel: "warn",
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), copyManifest(), buildContentScript()],
  build: {
    outDir: "dist",
    emptyDirBeforeWrite: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
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
