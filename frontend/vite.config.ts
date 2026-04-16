import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@qrlab/types": path.resolve(__dirname, "../packages/types/src/index.ts"),
    },
  },
})
