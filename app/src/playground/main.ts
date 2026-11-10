// Model playground: render one wahwah utterance, play its audio once, and
// drive every model cell of the grid from the same face-control track on one
// clock. The grid size and each cell's model and mouth are saved in the browser.

import { DEFAULT_VOICE, loadVoices, renderMumble } from 'wahwah';
import { sampleFaceTrack, type RenderedUtterance } from 'wahwah/performance';
import { Player } from '../shared/playback';
import * as THREE from 'three';
import { VrmFace } from '../shared/host/vrm';
import { ControlFollower } from '../shared/host/follower';
import { mouthModes, type MouthMode } from '../shared/host/mouthPlan';
import { inkMethods, type InkMethod } from '../shared/host/inkMethods';
import { InkDitherPass } from '../shared/host/inkDither';
import { ComicPrintPass } from '../shared/host/comicPrint';
import localModels from 'virtual:local-models';
import {
  MAX_SIDE, PROFILES_KEY, STORAGE_KEY, defaultLayout, parseProfiles, resizeLayout, serializeProfiles,
  type CellState, type Layout, type Profiles,
} from './layout';
import { closeMenu, openMenu, type MenuItem } from './menu';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = byId<HTMLElement>('grid');
const textEl = byId<HTMLInputElement>('text');
const speakBtn = byId<HTMLButtonElement>('speak');
const fileEl = byId<HTMLInputElement>('file');
const layoutBtn = byId<HTMLButtonElement>('layoutBtn');

// Browsers cap live WebGL contexts (about 16, fewer on some), and the oldest
// is lost when the cap is hit. So every cell shares one offscreen renderer
// and copies its frame onto its own 2D canvas.
const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
// Full-screen style passes, shared like the renderer; each draws into `gl` before its cell copies the frame.
const inkPass = new InkDitherPass();
const comicPass = new ComicPrintPass();

const TOFU_URL = `${import.meta.env.BASE_URL}tofu/corner-cut.vrm`;
/** Menu entry that opens the file picker instead of choosing a model. */
const OPEN = '__open__';
let pendingCell: Cell | null = null;
const modelName = (f: string) => f.split('/').pop()!.replace(/\.vrm$/i, '');

/** Files opened from disk this session; they cannot come back after a reload. */
const files = new Map<string, { url: string; label: string }>();
let nextFileId = 1;

interface Source {
  url: string;
  label: string;
  tofu: boolean;
}

function resolveSource(model: string): Source | null {
  if (model === 'tofu') return { url: TOFU_URL, label: 'Tofu', tofu: true };
  if (model.startsWith('local:')) {
    const file = model.slice('local:'.length);
    return { url: `${import.meta.env.BASE_URL}models/${file}`, label: modelName(file), tofu: false };
  }
  const opened = files.get(model.slice('file:'.length));
  return opened ? { ...opened, tofu: false } : null;
}

/** A saved model that still exists: Tofu, or a local file that is still listed. */
const isKnownModel = (model: string) =>
  model === 'tofu' || (model.startsWith('local:') && localModels.vrm.includes(model.slice('local:'.length)));

function modelOptions(): HTMLOptionElement[] {
  return [
    new Option('Empty', ''),
    new Option('Tofu', 'tofu'),
    ...localModels.vrm.map((f) => new Option(modelName(f), `local:${f}`)),
    ...[...files].map(([id, f]) => new Option(f.label, `file:${id}`)),
    new Option('Open .vrm file…', OPEN),
  ];
}

interface Cell {
  el: HTMLElement;
  modelEl: HTMLSelectElement;
  mouthEl: HTMLSelectElement;
  modelChip: HTMLButtonElement;
  mouthChip: HTMLButtonElement;
  inkEl: HTMLSelectElement;
  inkChip: HTMLButtonElement;
  hintEl: HTMLElement;
  statusEl: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  host: VrmFace | null;
}

let cells: Cell[] = [];
let cols = 1;
let rows = 1;

function makeCell(model: string | null, mouth: MouthMode, ink: InkMethod): Cell {
  const el = document.createElement('section');
  el.className = 'panel';
  el.innerHTML =
    '<div class="chips">' +
    '<button type="button" class="pill" aria-haspopup="menu" aria-expanded="false"></button>' +
    '<button type="button" class="chip mouth-chip" aria-haspopup="menu" aria-expanded="false" hidden></button>' +
    '<button type="button" class="chip ink-chip" aria-haspopup="menu" aria-expanded="false" hidden></button>' +
    '</div><div class="hint">Choose a model</div><div class="status"></div>' +
    '<div class="state" hidden><select class="model" aria-label="Model"></select><select class="mouth" aria-label="Mouth"></select><select class="ink" aria-label="Ink dither"></select></div>';
  const modelEl = el.querySelector<HTMLSelectElement>('.model')!;
  const mouthEl = el.querySelector<HTMLSelectElement>('.mouth')!;
  const inkEl = el.querySelector<HTMLSelectElement>('.ink')!;
  const canvas = document.createElement('canvas');
  el.prepend(canvas);
  mouthEl.replaceChildren(...Object.entries(mouthModes).map(([m, label]) => new Option(label, m)));
  mouthEl.value = mouth;
  inkEl.replaceChildren(...Object.entries(inkMethods).map(([m, { label }]) => new Option(label, m)));
  inkEl.value = ink;
  const cell: Cell = {
    el, modelEl, mouthEl, inkEl, canvas,
    modelChip: el.querySelector<HTMLButtonElement>('.pill')!,
    mouthChip: el.querySelector<HTMLButtonElement>('.mouth-chip')!,
    inkChip: el.querySelector<HTMLButtonElement>('.ink-chip')!,
    hintEl: el.querySelector<HTMLElement>('.hint')!,
    statusEl: el.querySelector<HTMLElement>('.status')!,
    ctx: canvas.getContext('2d')!,
    host: null,
  };
  modelEl.replaceChildren(...modelOptions());
  modelEl.addEventListener('change', () => {
    if (modelEl.value === OPEN) {
      modelEl.value = modelEl.dataset.prev ?? '';
      pendingCell = cell;
      fileEl.click();
      return;
    }
    setModel(cell, modelEl.value || null);
    save();
  });
  mouthEl.addEventListener('change', () => {
    if (cell.host) cell.host.mouthMode = mouthEl.value as MouthMode;
    save();
  });
  inkEl.addEventListener('change', save);
  for (const [chip, select] of [[cell.modelChip, modelEl], [cell.mouthChip, mouthEl], [cell.inkChip, inkEl]] as const) {
    chip.addEventListener('click', () => openMenu(chip, selectItems(select, () => refreshChips(cell))));
  }
  setModel(cell, model);
  refreshChips(cell);
  return cell;
}

/** The menu rows for a select: its options, with the chosen one checked. */
function selectItems(select: HTMLSelectElement, after: () => void): MenuItem[] {
  const items: MenuItem[] = [];
  for (const option of select.options) {
    if (option.value === OPEN) items.push({ divider: true });
    items.push({
      label: option.text,
      selected: option.value === select.value,
      accent: option.value === OPEN,
      onPick: () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change'));
        after();
      },
    });
  }
  return items;
}

/** Make a cell's chips show its current choices; the selects hold the state. */
function refreshChips(cell: Cell): void {
  const set = (el: HTMLElement, text: string) => {
    if (el.textContent !== text) el.textContent = text;
  };
  set(cell.modelChip, `${cell.modelEl.selectedOptions[0]?.text ?? 'Empty'} ▾`);
  set(cell.mouthChip, `${cell.mouthEl.selectedOptions[0]?.text ?? ''} ▾`);
  cell.mouthChip.hidden = cell.mouthEl.hidden;
  set(cell.inkChip, `${cell.inkEl.selectedOptions[0]?.text ?? ''} ▾`);
  cell.inkChip.hidden = cell.inkEl.hidden;
  cell.hintEl.hidden = !!cell.modelEl.value;
}

function setModel(cell: Cell, model: string | null): void {
  cell.host?.navigation.dispose();
  cell.host = null;
  cell.statusEl.textContent = '';
  cell.mouthEl.hidden = true;
  cell.inkEl.hidden = true;
  cell.ctx.clearRect(0, 0, cell.canvas.width, cell.canvas.height);
  cell.modelEl.value = model ?? '';
  cell.modelEl.dataset.prev = cell.modelEl.value;
  const source = model ? resolveSource(model) : null;
  if (!source) {
    cell.modelEl.value = '';
    cell.modelEl.dataset.prev = '';
    return;
  }
  const host = new VrmFace();
  host.navigation.connect(cell.canvas);
  host.mouthMode = cell.mouthEl.value as MouthMode;
  cell.host = host;
  void host.load(source.url, source.label, source.tofu);
}

function disposeCell(cell: Cell): void {
  cell.host?.navigation.dispose();
  cell.el.remove();
}

function currentLayout(): Layout {
  return {
    cols, rows,
    cells: cells.map((c) => ({ model: c.modelEl.value || null, mouth: c.mouthEl.value as MouthMode, ink: c.inkEl.value as InkMethod })),
  };
}

function save(): void {
  profiles.layouts[profiles.active] = currentLayout();
  try {
    localStorage.setItem(PROFILES_KEY, serializeProfiles(profiles));
  } catch {
    // Storage can be blocked; the layout then lasts only for this visit.
  }
}

function showGrid(): void {
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  grid.replaceChildren(...cells.map((c) => c.el));
  updateLayoutButton();
}

/** Choices of cells hidden by shrinking the grid, by `row,column`, so growing it again brings them back. */
const hidden = new Map<string, CellState>();

/** Change the grid size, keeping the cells (and their loaded models) whose row and column survive. */
function applySize(newCols: number, newRows: number): void {
  const before = currentLayout();
  const resized = resizeLayout(before, newCols, newRows);
  const kept: Cell[] = [];
  for (let r = 0; r < resized.rows; r++) {
    for (let c = 0; c < resized.cols; c++) {
      const old = r < rows && c < cols ? cells[r * cols + c] : undefined;
      if (old) {
        kept.push(old);
        continue;
      }
      const back = hidden.get(`${r},${c}`);
      hidden.delete(`${r},${c}`);
      kept.push(makeCell(back?.model ?? null, back?.mouth ?? 'original', back?.ink ?? 'bayer'));
    }
  }
  cells.forEach((cell, i) => {
    if (kept.includes(cell)) return;
    hidden.set(`${Math.floor(i / cols)},${i % cols}`, before.cells[i]);
    disposeCell(cell);
  });
  cells = kept;
  cols = resized.cols;
  rows = resized.rows;
  showGrid();
  save();
}

function renderCell(cell: Cell, dt: number): void {
  const host = cell.host;
  if (!host) return;
  const { canvas } = cell;
  const ratio = Math.min(window.devicePixelRatio, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    host.resize(canvas.clientWidth, canvas.clientHeight);
  }
  gl.setPixelRatio(1);
  gl.setSize(width, height, false);
  host.update(dt);
  if (host.renderStyle === 'ink-dither') inkPass.render(gl, host, width, height, cell.inkEl.value as InkMethod);
  else if (host.renderStyle === 'comic-print') comicPass.render(gl, host, width, height);
  else gl.render(host.scene, host.camera);
  cell.ctx.drawImage(gl.domElement, 0, 0);
}

const follower = new ControlFollower();
let player: Player | null = null;
let track: RenderedUtterance['track'] = null;
let seed = 1;

async function speak(): Promise<void> {
  speakBtn.disabled = true;
  try {
    player ??= new Player();
    const utterance = renderMumble(
      textEl.value,
      { seed: seed++ },
      DEFAULT_VOICE,
      player.sampleRate,
      { engine: 'formant', brassColor: 0.75 },
      true,
    );
    track = utterance.track;
    await player.play(utterance.audio as Float32Array<ArrayBuffer>);
  } finally {
    speakBtn.disabled = false;
  }
}

function stop(): void {
  player?.stop();
  follower.relax();
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const position = player?.position() ?? null;
  if (track && position !== null) follower.follow(sampleFaceTrack(track, position));
  else follower.relax();
  follower.tick(dt);
  for (const cell of cells) {
    if (!cell.host) continue;
    cell.host.setControls(follower.controls);
    renderCell(cell, dt);
    cell.statusEl.textContent = cell.host.status;
    cell.mouthEl.hidden = !cell.host.puppetMouth;
    cell.inkEl.hidden = cell.host.renderStyle !== 'ink-dither';
    refreshChips(cell);
  }
  requestAnimationFrame(frame);
}

// Pinch or ctrl+wheel would zoom the whole page; keep the layout fixed.
window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault());

speakBtn.addEventListener('click', () => void speak());
byId('stop').addEventListener('click', stop);

function updateLayoutButton(): void {
  layoutBtn.textContent = `${profiles.active} · ${cols} × ${rows} ▾`;
}

/** Squares for the grid size: hover to preview columns × rows, click to apply. */
function sizePicker(): HTMLElement {
  const wrap = document.createElement('div');
  const label = document.createElement('div');
  label.className = 'heading';
  const squares = document.createElement('div');
  squares.className = 'sq';
  const all: HTMLElement[] = [];
  for (let r = 1; r <= MAX_SIDE; r++) {
    for (let c = 1; c <= MAX_SIDE; c++) {
      const sq = document.createElement('i');
      sq.dataset.c = String(c);
      sq.dataset.r = String(r);
      all.push(sq);
      squares.append(sq);
    }
  }
  const show = (c: number, r: number) => {
    label.textContent = `Grid size · ${c} × ${r}`;
    for (const sq of all) sq.classList.toggle('on', Number(sq.dataset.c) <= c && Number(sq.dataset.r) <= r);
  };
  show(cols, rows);
  squares.addEventListener('mouseover', (e) => {
    const sq = e.target as HTMLElement;
    if (sq.dataset.c) show(Number(sq.dataset.c), Number(sq.dataset.r));
  });
  squares.addEventListener('mouseleave', () => show(cols, rows));
  squares.addEventListener('click', (e) => {
    const sq = e.target as HTMLElement;
    if (!sq.dataset.c) return;
    closeMenu();
    applySize(Number(sq.dataset.c), Number(sq.dataset.r));
  });
  wrap.append(label, squares);
  return wrap;
}

function switchProfile(name: string): void {
  save();
  profiles.active = name;
  showLayout(profiles.layouts[name]);
  save();
}

function newProfile(): void {
  const name = prompt('Name for the new profile (it starts as a copy of this layout):')?.trim();
  if (!name) return;
  if (name in profiles.layouts) {
    alert(`A profile named "${name}" already exists.`);
    return;
  }
  save();
  profiles.layouts[name] = currentLayout();
  profiles.active = name;
  updateLayoutButton();
  save();
}

function deleteProfile(name: string): void {
  if (!confirm(`Delete the profile "${name}"? This cannot be undone.`)) return;
  closeMenu();
  const wasActive = name === profiles.active;
  delete profiles.layouts[name];
  if (wasActive) {
    profiles.active = Object.keys(profiles.layouts)[0];
    showLayout(profiles.layouts[profiles.active]);
  }
  updateLayoutButton();
  save();
}

layoutBtn.addEventListener('click', () => {
  const names = Object.keys(profiles.layouts);
  openMenu(layoutBtn, [
    { heading: 'Profiles' },
    ...names.map((name): MenuItem => ({
      label: `${name} · ${profiles.layouts[name].cols} × ${profiles.layouts[name].rows}`,
      selected: name === profiles.active,
      onPick: () => name !== profiles.active && switchProfile(name),
      onRemove: names.length > 1 ? () => deleteProfile(name) : undefined,
    })),
    { label: 'New profile…', accent: true, onPick: newProfile },
    { divider: true },
    { node: sizePicker() },
    { divider: true },
    {
      label: 'Reset this profile',
      onPick: () => {
        showLayout(defaultLayout());
        save();
      },
    },
  ]);
});

fileEl.addEventListener('change', () => {
  const target = pendingCell;
  pendingCell = null;
  let first = true;
  for (const file of fileEl.files ?? []) {
    const id = String(nextFileId++);
    files.set(id, { url: URL.createObjectURL(file), label: file.name });
    for (const cell of cells) cell.modelEl.add(new Option(file.name, `file:${id}`), cell.modelEl.options.length - 1);
    // The cell whose menu was used gets the first file; others fill empty cells.
    const dest = first && target && cells.includes(target) ? target : cells.find((c) => !c.modelEl.value);
    first = false;
    if (dest) {
      setModel(dest, `file:${id}`);
      save();
    }
  }
  fileEl.value = '';
});

/** Replace every cell with the ones a layout describes. */
function showLayout(layout: Layout): void {
  for (const cell of cells) disposeCell(cell);
  hidden.clear();
  cols = layout.cols;
  rows = layout.rows;
  cells = layout.cells.map((c) => makeCell(c.model, c.mouth, c.ink));
  showGrid();
}

function savedText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const profiles: Profiles = parseProfiles(savedText(PROFILES_KEY), isKnownModel, savedText(STORAGE_KEY));

showLayout(profiles.layouts[profiles.active]);
void loadVoices().then(() => (speakBtn.disabled = false));
requestAnimationFrame(frame);
