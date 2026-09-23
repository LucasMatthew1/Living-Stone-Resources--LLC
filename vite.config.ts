import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import weburaComponentTagger from "./webura-component-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** For Webura web preview: iframe loads this dev server directly (no proxy), so inject the same log bridge as the desktop proxy. Idempotent with proxy inject via __weburaPreviewLogsInstalled. */
function weburaPreviewLogsPlugin(): Plugin {
  return {
    name: "preview-logs",
    apply: "serve",
    transformIndexHtml() {
      const file = path.join(__dirname, "preview_iframe_logs.js");
      const children = fs.readFileSync(file, "utf8");
      return [
        {
          tag: "script",
          injectTo: "head-prepend",
          children,
        },
      ];
    },
  };
}

/**
 * Injects the click-to-select + live text-edit ("T") client into the dev-server
 * preview. In build mode the web server bakes this in via `injectHeadScripts`;
 * for the live dev server the iframe loads Vite directly, so we inject it here.
 * Guarded by the same token the build path uses so it never double-injects.
 */
function weburaEditorClientPlugin(): Plugin {
  return {
    name: "webura-editor-client",
    apply: "serve",
    transformIndexHtml() {
      const file = path.join(__dirname, "webura-component-selector-client.js");
      const children = fs.readFileSync(file, "utf8");
      return [
        {
          tag: "script",
          injectTo: "head",
          children,
        },
      ];
    },
  };
}

/**
 * Adds data-webura-* attributes for click-to-select in the Webura editor.
 * Runs in both dev and the static production builds used for web previews.
 * Gated by WEBURA_TAG_COMPONENTS: the preview build sets "1", public share
 * builds set "0" (no tagging, so source paths aren't leaked to viewers).
 */
function weburaComponentTaggerPlugin(): Plugin | null {
  if (process.env.WEBURA_TAG_COMPONENTS === "0") return null;
  return weburaComponentTagger();
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    weburaComponentTaggerPlugin(),
    weburaPreviewLogsPlugin(),
    weburaEditorClientPlugin(),
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
