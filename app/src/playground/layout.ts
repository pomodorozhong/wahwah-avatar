// The playground grid: how many columns and rows, and which model and mouth
// each cell holds. Pure data with no DOM, so saving and loading can be tested.

import { mouthModes, type MouthMode } from '../shared/host/mouthPlan';

/** Most columns or rows; 4 x 4 is 16 panels, about the WebGL context cap that the shared renderer avoids. */
export const MAX_SIDE = 4;

export const STORAGE_KEY = 'wahwah-avatar.layout.v1';

export interface CellState {
  /** `tofu`, `local:<file>` or `file:<id>`; null for an empty cell. */
  model: string | null;
  mouth: MouthMode;
}

export interface Layout {
  cols: number;
  rows: number;
  /** Row by row, `cols * rows` long. */
  cells: CellState[];
}

const emptyCell = (): CellState => ({ model: null, mouth: 'original' });

export const clampSide = (n: number): number => (Number.isFinite(n) ? Math.min(MAX_SIDE, Math.max(1, Math.round(n))) : 1);

export function defaultLayout(): Layout {
  return { cols: 2, rows: 1, cells: [{ model: 'tofu', mouth: 'original' }, emptyCell()] };
}

/** Change the grid size; cells keep their row and column, new cells are empty. */
export function resizeLayout(layout: Layout, cols: number, rows: number): Layout {
  cols = clampSide(cols);
  rows = clampSide(rows);
  const cells: CellState[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(r < layout.rows && c < layout.cols ? layout.cells[r * layout.cols + c] : emptyCell());
    }
  }
  return { cols, rows, cells };
}

/** Models that can come back after a reload; a file opened from disk cannot. */
export const isPersistentModel = (model: string): boolean => model === 'tofu' || model.startsWith('local:');

export function serializeLayout(layout: Layout): string {
  const cells = layout.cells.map((cell) => ({
    model: cell.model !== null && isPersistentModel(cell.model) ? cell.model : null,
    mouth: cell.mouth,
  }));
  return JSON.stringify({ cols: layout.cols, rows: layout.rows, cells });
}

/** Read a saved layout. Anything unreadable gives the default; a model that `valid` rejects (a removed local file) leaves its cell empty. */
export function parseLayout(text: string | null, valid: (model: string) => boolean): Layout {
  if (!text) return defaultLayout();
  try {
    const data = JSON.parse(text) as { cols?: unknown; rows?: unknown; cells?: unknown };
    if (typeof data.cols !== 'number' || typeof data.rows !== 'number' || !Array.isArray(data.cells)) return defaultLayout();
    const cols = clampSide(data.cols);
    const rows = clampSide(data.rows);
    const savedCells: unknown[] = data.cells;
    const cells = Array.from({ length: cols * rows }, (_, i): CellState => {
      const saved = savedCells[i] as { model?: unknown; mouth?: unknown } | undefined;
      const model = typeof saved?.model === 'string' && valid(saved.model) ? saved.model : null;
      const mouth = typeof saved?.mouth === 'string' && saved.mouth in mouthModes ? (saved.mouth as MouthMode) : 'original';
      return { model, mouth };
    });
    return { cols, rows, cells };
  } catch {
    return defaultLayout();
  }
}

export const PROFILES_KEY = 'wahwah-avatar.profiles.v1';
export const DEFAULT_PROFILE = 'Default';

/** Named layouts the user can switch between; the active one follows every edit. */
export interface Profiles {
  active: string;
  layouts: Record<string, Layout>;
}

export function serializeProfiles(profiles: Profiles): string {
  const layouts = Object.fromEntries(
    Object.entries(profiles.layouts).map(([name, layout]) => [name, JSON.parse(serializeLayout(layout))]),
  );
  return JSON.stringify({ active: profiles.active, layouts });
}

/**
 * Read saved profiles. `legacy` is the older single saved layout, which becomes
 * the Default profile when no profiles were saved yet. Anything unreadable
 * gives one Default profile.
 */
export function parseProfiles(text: string | null, valid: (model: string) => boolean, legacy: string | null = null): Profiles {
  const fallback = (): Profiles => ({ active: DEFAULT_PROFILE, layouts: { [DEFAULT_PROFILE]: parseLayout(legacy, valid) } });
  if (!text) return fallback();
  try {
    const data = JSON.parse(text) as { active?: unknown; layouts?: unknown };
    if (typeof data.layouts !== 'object' || data.layouts === null || Array.isArray(data.layouts)) return fallback();
    const layouts: Record<string, Layout> = {};
    for (const [name, raw] of Object.entries(data.layouts)) layouts[name] = parseLayout(JSON.stringify(raw), valid);
    const names = Object.keys(layouts);
    if (names.length === 0) return fallback();
    const active = typeof data.active === 'string' && data.active in layouts ? data.active : names[0];
    return { active, layouts };
  } catch {
    return fallback();
  }
}
