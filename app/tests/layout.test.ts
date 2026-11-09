import { describe, expect, it } from 'vitest';
import {
  MAX_SIDE, clampSide, defaultLayout, parseLayout, parseProfiles, resizeLayout, serializeLayout, serializeProfiles, type Layout,
} from '../src/playground/layout';

const valid = (m: string) => m === 'tofu' || m === 'local:vrm/a.vrm';

const grid = (): Layout => ({
  cols: 2,
  rows: 2,
  cells: [
    { model: 'tofu', mouth: 'plates' },
    { model: 'local:vrm/a.vrm', mouth: 'original' },
    { model: null, mouth: 'original' },
    { model: 'file:1', mouth: 'gesturePlates' },
  ],
});

describe('clampSide', () => {
  it('keeps a side between 1 and the maximum', () => {
    expect(clampSide(0)).toBe(1);
    expect(clampSide(99)).toBe(MAX_SIDE);
    expect(clampSide(2.6)).toBe(3);
    expect(clampSide(Number.NaN)).toBe(1);
  });
});

describe('resizeLayout', () => {
  it('keeps each cell at its row and column', () => {
    const wider = resizeLayout(grid(), 3, 2);
    expect(wider.cells).toHaveLength(6);
    expect(wider.cells[0].model).toBe('tofu');
    expect(wider.cells[1].model).toBe('local:vrm/a.vrm');
    expect(wider.cells[2].model).toBeNull();
    expect(wider.cells[4].model).toBe('file:1');
  });

  it('drops cells that fall outside a smaller grid', () => {
    const smaller = resizeLayout(grid(), 1, 2);
    expect(smaller.cells.map((c) => c.model)).toEqual(['tofu', null]);
  });
});

describe('serializeLayout and parseLayout', () => {
  it('round-trips, leaving out models that cannot come back', () => {
    const loaded = parseLayout(serializeLayout(grid()), valid);
    expect(loaded.cells.map((c) => c.model)).toEqual(['tofu', 'local:vrm/a.vrm', null, null]);
    expect(loaded.cells[0].mouth).toBe('plates');
    expect(loaded.cells[3].mouth).toBe('gesturePlates');
  });

  it('empties a cell whose local model is gone', () => {
    const loaded = parseLayout(serializeLayout(grid()), (m) => m === 'tofu');
    expect(loaded.cells[1].model).toBeNull();
  });

  it('falls back to the default for missing or damaged text', () => {
    expect(parseLayout(null, valid)).toEqual(defaultLayout());
    expect(parseLayout('not json', valid)).toEqual(defaultLayout());
    expect(parseLayout('{"cols":"2"}', valid)).toEqual(defaultLayout());
  });

  it('clamps the size, pads short cell lists and ignores an unknown mouth', () => {
    const loaded = parseLayout('{"cols":9,"rows":1,"cells":[{"model":"tofu","mouth":"nope"}]}', valid);
    expect(loaded.cols).toBe(MAX_SIDE);
    expect(loaded.cells).toHaveLength(MAX_SIDE);
    expect(loaded.cells[0]).toEqual({ model: 'tofu', mouth: 'original' });
    expect(loaded.cells[1].model).toBeNull();
  });
});

describe('profiles', () => {
  it('round-trips named layouts and the active one', () => {
    const profiles = { active: 'Wide', layouts: { Default: defaultLayout(), Wide: resizeLayout(grid(), 3, 2) } };
    const back = parseProfiles(serializeProfiles(profiles), valid);
    expect(back.active).toBe('Wide');
    expect(Object.keys(back.layouts)).toEqual(['Default', 'Wide']);
    expect(back.layouts.Wide.cols).toBe(3);
    expect(back.layouts.Wide.cells[1].model).toBe('local:vrm/a.vrm');
  });

  it('does not save a file opened from disk', () => {
    const back = parseProfiles(serializeProfiles({ active: 'A', layouts: { A: grid() } }), (m) => valid(m) || m === 'file:1');
    expect(back.layouts.A.cells[3].model).toBeNull();
  });

  it('turns the older single layout into the Default profile', () => {
    const back = parseProfiles(null, valid, serializeLayout(grid()));
    expect(back.active).toBe('Default');
    expect(back.layouts.Default.cells[0].model).toBe('tofu');
  });

  it('falls back to one Default profile when the text is unreadable or empty', () => {
    for (const text of ['nope', '{}', '{"layouts":{}}', '{"layouts":[]}']) {
      const back = parseProfiles(text, valid);
      expect(Object.keys(back.layouts)).toEqual(['Default']);
    }
  });

  it('picks the first profile when the saved active one is missing', () => {
    const text = JSON.stringify({ active: 'gone', layouts: { A: JSON.parse(serializeLayout(grid())) } });
    expect(parseProfiles(text, valid).active).toBe('A');
  });
});
