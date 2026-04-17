import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Content scripts must be a single classic script (no `import` at top level).
 * This IIFE bundle inlines all extract/* + lib/messages deps into dist/content.js.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/content/scrape.ts"),
      name: "CoverClickContent",
      formats: ["iife"],
      fileName: () => "content",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "content.js",
        format: "iife",
      },
    },
  },
});
