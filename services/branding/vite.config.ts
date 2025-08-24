import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 8092,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
