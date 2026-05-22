import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  root: path.resolve(__dirname, 'client'),
  define: {
    global: 'globalThis',
    'window.global': 'globalThis'
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})