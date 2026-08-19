import { defineConfig } from 'vite';
import { inlineTemplates } from './vite-plugins/inline-templates.js';

export default defineConfig({
  plugins: [inlineTemplates()],

  build: {
    lib: {
      entry: './src/index.js',
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    minify: true,
    target: 'es2020',
  },

  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
