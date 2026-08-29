import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  resolve: {
    alias: { '@pipeline': new URL('./pipeline/src', import.meta.url).pathname },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
