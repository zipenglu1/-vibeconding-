import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@bi/ui-kit": resolve(__dirname, "../../packages/ui-kit/src/index.ts"),
      "@bi/chart-presets": resolve(__dirname, "../../packages/chart-presets/src/index.ts"),
    },
  },
  build: {
    // The chart bundle is lazy-loaded and has already been reduced materially via
    // selective echarts/core imports. Keep the warning threshold slightly above
    // the current async chart chunk size to avoid noisy false positives.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("echarts") || id.includes("echarts-for-react")) {
            return "charts";
          }
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
