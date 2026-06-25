import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages 项目站点路径前缀：<username>.github.io/pdfdrops/
  base: '/pdfdrops/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
  build: {
    // 手动分包：pdf-lib 和 pdfjs-dist 单独打包，按需加载
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdf-lib')) return 'pdf-lib';
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
