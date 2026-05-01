import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'client'),
  define: {
    global: 'window',
    'process.env': {},
    'process': { env: {} }
  }
})