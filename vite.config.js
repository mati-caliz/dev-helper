import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    preact(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/index.html',
    },
  },
  server: {
    open: '/src/index.html'
  },
});