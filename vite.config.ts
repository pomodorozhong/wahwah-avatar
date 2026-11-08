import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { localModels } from './tools/localModels.ts';

/** Emits the bundled model for Pages, where publicDir copying is off. */
function pagesAssets(pages: boolean): Plugin {
  return {
    name: 'pages-assets',
    apply: 'build',
    generateBundle() {
      if (!pages) return;
      this.emitFile({ type: 'asset', fileName: 'tofu/corner-cut.vrm', source: readFileSync(resolve(import.meta.dirname, 'app/public/tofu/corner-cut.vrm')) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // The app lives in app/; the repository root only holds tooling and docs.
  root: resolve(import.meta.dirname, 'app'),
  // GitHub Pages serves the project under /wahwah-avatar/.
  base: mode === 'pages' ? '/wahwah-avatar/' : '/',
  // The package ships its WASM as an asset; Node tests need it as a data URL.
  assetsInclude: ['**/*.wasm'],
  // An ignored public/models file must never enter a Pages artifact or list. Pages
  // copies only the bundled Tofu, so publicDir copying is off there.
  publicDir: mode === 'pages' ? false : 'public',
  plugins: [localModels(resolve(import.meta.dirname, 'app/public/models'), mode !== 'pages'), pagesAssets(mode === 'pages')],
  build: { outDir: resolve(import.meta.dirname, 'dist'), emptyOutDir: true, chunkSizeWarningLimit: 800 },
  test: { environment: 'node' },
}));
