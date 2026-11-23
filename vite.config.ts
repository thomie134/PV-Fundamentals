/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import path from 'node:path';

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkMath, remarkGfm], providerImportSource: '@mdx-js/react' }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@content': path.resolve(__dirname, 'content'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/katex')) return 'katex';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/@floating-ui')) return 'floating';
          // Course data (questions, glossary, symbols, formulas…) in one cacheable chunk; reference spectra stay separate.
          if (id.includes('/content/') && id.endsWith('.json') && !id.includes('/content/data/')) return 'content';
          return undefined;
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'content/**/*.test.ts'],
    environment: 'node',
  },
});
