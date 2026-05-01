import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'client'),
  define: {
    global: 'globalThis',
    'process.env': {},
    'process': { env: {} },
    'window.global': 'globalThis'
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})