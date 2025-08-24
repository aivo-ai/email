import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  css: {
    postcss: {}
  },
  define: {
    'process.env.DOMAIN': JSON.stringify('ceerion.com'),
    'process.env.HOST': JSON.stringify('mail.ceerion.com')
  }
})
