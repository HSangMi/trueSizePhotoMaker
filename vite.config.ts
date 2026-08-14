import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolveBase } from './vite.base';

const base = resolveBase();
// Helps diagnose wrong asset paths on GitHub Pages builds.
console.log(`[vite] base=${base}`);

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
