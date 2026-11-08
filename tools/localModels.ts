import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

export const MODELS_ID = 'virtual:local-models';

/** Every .vrm file under `dir`, as paths relative to it, sorted. */
export function listModelFiles(dir: string, base = dir): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .flatMap((e) =>
      e.isDirectory() ? listModelFiles(join(dir, e.name), base) : [relative(base, join(dir, e.name)).split('\\').join('/')],
    )
    .filter((f) => f.toLowerCase().endsWith('.vrm'))
    .sort();
}

/**
 * Lists the user's local, git-ignored model files (`modelsDir`) as the
 * `virtual:local-models` module. When `enabled` is false the list is empty, so
 * a Pages build never advertises them.
 */
export function localModels(modelsDir: string, enabled: boolean): Plugin {
  return {
    name: 'local-models',
    resolveId: (id) => (id === MODELS_ID ? '\0' + MODELS_ID : undefined),
    load(id) {
      if (id !== '\0' + MODELS_ID) return;
      return `export default ${JSON.stringify({ vrm: enabled ? listModelFiles(modelsDir) : [] })};`;
    },
    configureServer(server) {
      if (!enabled) return;
      server.watcher.add(modelsDir);
      const refresh = (file: string) => {
        if (!file.startsWith(modelsDir)) return;
        const mod = server.moduleGraph.getModuleById('\0' + MODELS_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}
