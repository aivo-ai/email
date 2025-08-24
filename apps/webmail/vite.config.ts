import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  css: {
    postcss: {}
  },
  define: {
    'process.env.DOMAIN': JSON.stringify('ceerion.com'),
    'process.env.HOST': JSON.stringify('mail.ceerion.com')
  }
})
