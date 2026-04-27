// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@qrlab/types": path.resolve(__dirname, "../packages/types/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the backend during development
      "/api": {
        target:    "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});