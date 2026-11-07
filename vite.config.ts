import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the project under /wahwah-avatar/.
  base: mode === 'pages' ? '/wahwah-avatar/' : '/',
  // The package ships its WASM as an asset; Node tests need it as a data URL.
  assetsInclude: ['**/*.wasm'],
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'node' },
}));
