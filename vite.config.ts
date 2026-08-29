import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  resolve: {
    alias: { '@pipeline': new URL('./pipeline/src', import.meta.url).pathname },
  },
  // Honor a port assigned by the environment (e.g. preview tooling).
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  build: { outDir: '../dist', emptyOutDir: true },
});
