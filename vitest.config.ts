import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@pipeline': new URL('./pipeline/src', import.meta.url).pathname },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'pipeline', environment: 'node', include: ['pipeline/test/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'app', environment: 'jsdom', include: ['app/test/**/*.test.tsx'] },
      },
    ],
  },
});
