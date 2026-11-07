import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listModelFiles, localModels, MODELS_ID } from '../../tools/localModels';

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'local-models-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('listModelFiles', () => {
  it('finds .vrm files in nested folders, sorted, and ignores everything else', () => {
    const dir = tempDir();
    mkdirSync(join(dir, 'sample'));
    writeFileSync(join(dir, 'b.vrm'), '');
    writeFileSync(join(dir, 'A.VRM'), '');
    writeFileSync(join(dir, 'sample', 'c.vrm'), '');
    writeFileSync(join(dir, 'notes.txt'), '');
    writeFileSync(join(dir, 'archive.zip'), '');
    expect(listModelFiles(dir)).toEqual(['A.VRM', 'b.vrm', 'sample/c.vrm']);
  });

  it('is empty when the folder is missing', () => {
    expect(listModelFiles(join(tempDir(), 'nope'))).toEqual([]);
  });
});

describe('localModels plugin', () => {
  const source = (plugin: ReturnType<typeof localModels>) =>
    (plugin.load as (this: unknown, id: string) => string | undefined).call({}, '\0' + MODELS_ID);

  it('serves the list when enabled and an empty list when disabled', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'x.vrm'), '');
    expect(source(localModels(dir, true))).toBe('export default {"vrm":["x.vrm"]};');
    expect(source(localModels(dir, false))).toBe('export default {"vrm":[]};');
  });
});
