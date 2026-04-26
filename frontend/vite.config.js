import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // This provides the global window object and empty environment variables
    // that older Webpack packages expect to find in the browser.
    global: 'window',
    'process.env': {}
  }
})