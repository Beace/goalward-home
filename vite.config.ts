import { defineConfig } from "vite";

export default defineConfig({
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
