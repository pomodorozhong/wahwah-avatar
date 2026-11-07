import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  // The app lives in app/; the repository root only holds tooling and docs.
  root: resolve(import.meta.dirname, 'app'),
  // GitHub Pages serves the project under /wahwah-avatar/.
  base: mode === 'pages' ? '/wahwah-avatar/' : '/',
  // The package ships its WASM as an asset; Node tests need it as a data URL.
  assetsInclude: ['**/*.wasm'],
  build: { outDir: resolve(import.meta.dirname, 'dist'), emptyOutDir: true, chunkSizeWarningLimit: 800 },
  test: { environment: 'node' },
}));
