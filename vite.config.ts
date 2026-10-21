import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Moves the built stylesheet into <head> so the first HTML response can paint
 * the hero without a second round trip. Outfit woff2 URLs are preloaded from
 * that same CSS, after Vite has hashed them.
 */
function inlineBuiltCss(): Plugin {
  return {
    name: "inline-built-css",
    apply: "build",
    closeBundle() {
      const htmlPath = resolve("dist/index.html");
      let html = readFileSync(htmlPath, "utf8");
      const match = html.match(/<link\s+rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
      if (!match) throw new Error("built stylesheet link was not found");
      const cssPath = resolve(`dist${match[1]}`);
      let css = readFileSync(cssPath, "utf8");
      css = css.replace(/url\((['"]?)(?:\.\/|\/assets\/)([^)"']+)\1\)/g, "url(/assets/$2)");
      css = css.replace(/<\/style/gi, "<\\/style");

      const preloads = [
        ...new Set(
          [...css.matchAll(/url\((['"]?)(\/assets\/outfit-latin-(?:400|500)-[^)"']+\.woff2)\1\)/g)].map(
            (found) => found[2],
          ),
        ),
      ];
      const links = preloads
        .map((url) => `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin />`)
        .join("");
      html = html.replace(match[0], "");
      html = html.replace("</head>", `${links}<style>${css}</style></head>`);
      writeFileSync(htmlPath, html);
      unlinkSync(cssPath);
    },
  };
}

export default defineConfig({
  plugins: [inlineBuiltCss()],
  server: {
    proxy: {
      "/api/latest.json": {
        target: "https://releases.goalward.dev",
        changeOrigin: true,
        rewrite: () => "/latest.json",
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
