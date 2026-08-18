import { defineConfig } from 'vite';
import { inlineTemplates } from './vite-plugins/inline-templates.js';

export default defineConfig({
  plugins: [inlineTemplates()],

  build: {
    lib: {
      entry: {
        'ng-modern': './src/index.js',
        'core/element': './src/core/element.js',
        'core/reactive': './src/core/reactive.js',
        'core/scheduler': './src/core/scheduler.js',
        'di/container': './src/di/container.js',
        'di/tokens': './src/di/tokens.js',
        'router/router': './src/router/router.js',
        'http/http': './src/http/http.js',
        'forms/field': './src/forms/field.js',
        'forms/form-group': './src/forms/form-group.js',
        'forms/parsers': './src/forms/parsers.js',
        'forms/formatters': './src/forms/formatters.js',
        'forms/validators': './src/forms/validators.js',
        'animate/animate': './src/animate/animate.js',
        'security/sanitize': './src/security/sanitize.js',
        'filters/intl': './src/filters/intl.js',
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
  },

  // Dev server — serves native ES modules, no bundling
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
