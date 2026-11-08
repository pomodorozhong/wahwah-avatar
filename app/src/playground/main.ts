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
import localModels from 'virtual:local-models';
import {
  MAX_SIDE, STORAGE_KEY, clampSide, parseLayout, resizeLayout, serializeLayout, type Layout,
} from './layout';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = byId<HTMLElement>('grid');
const textEl = byId<HTMLInputElement>('text');
const speakBtn = byId<HTMLButtonElement>('speak');
const fileEl = byId<HTMLInputElement>('file');
const colsEl = byId<HTMLInputElement>('cols');
const rowsEl = byId<HTMLInputElement>('rows');

// Browsers cap live WebGL contexts (about 16, fewer on some), and the oldest
// is lost when the cap is hit. So every cell shares one offscreen renderer
// and copies its frame onto its own 2D canvas.
const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });

const TOFU_URL = `${import.meta.env.BASE_URL}tofu/corner-cut.vrm`;
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
  ];
}

interface Cell {
  el: HTMLElement;
  modelEl: HTMLSelectElement;
  mouthEl: HTMLSelectElement;
  statusEl: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  host: VrmFace | null;
}

let cells: Cell[] = [];
let cols = 1;
let rows = 1;

function makeCell(model: string | null, mouth: MouthMode): Cell {
  const el = document.createElement('section');
  el.className = 'panel';
  el.innerHTML =
    '<div class="head"><select class="model" aria-label="Model"></select><select class="mouth" aria-label="Mouth" hidden></select></div>' +
    '<div class="stageview"><div class="status"></div></div>';
  const modelEl = el.querySelector<HTMLSelectElement>('.model')!;
  const mouthEl = el.querySelector<HTMLSelectElement>('.mouth')!;
  const view = el.querySelector<HTMLElement>('.stageview')!;
  const canvas = document.createElement('canvas');
  view.prepend(canvas);
  mouthEl.replaceChildren(...Object.entries(mouthModes).map(([m, label]) => new Option(label, m)));
  mouthEl.value = mouth;
  const cell: Cell = {
    el, modelEl, mouthEl, canvas,
    statusEl: view.querySelector<HTMLElement>('.status')!,
    ctx: canvas.getContext('2d')!,
    host: null,
  };
  modelEl.replaceChildren(...modelOptions());
  modelEl.addEventListener('change', () => {
    setModel(cell, modelEl.value || null);
    save();
  });
  mouthEl.addEventListener('change', () => {
    if (cell.host) cell.host.mouthMode = mouthEl.value as MouthMode;
    save();
  });
  setModel(cell, model);
  return cell;
}

function setModel(cell: Cell, model: string | null): void {
  cell.host?.navigation.dispose();
  cell.host = null;
  cell.statusEl.textContent = '';
  cell.mouthEl.hidden = true;
  cell.ctx.clearRect(0, 0, cell.canvas.width, cell.canvas.height);
  cell.modelEl.value = model ?? '';
  const source = model ? resolveSource(model) : null;
  if (!source) {
    cell.modelEl.value = '';
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
    cells: cells.map((c) => ({ model: c.modelEl.value || null, mouth: c.mouthEl.value as MouthMode })),
  };
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeLayout(currentLayout()));
  } catch {
    // Storage can be blocked; the layout then lasts only for this visit.
  }
}

function showGrid(): void {
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.replaceChildren(...cells.map((c) => c.el));
  colsEl.value = String(cols);
  rowsEl.value = String(rows);
}

/** Apply a layout, keeping the cells (and their loaded models) whose row and column survive. */
function applySize(newCols: number, newRows: number): void {
  const resized = resizeLayout(currentLayout(), newCols, newRows);
  const kept: Cell[] = [];
  for (let r = 0; r < resized.rows; r++) {
    for (let c = 0; c < resized.cols; c++) {
      const old = r < rows && c < cols ? cells[r * cols + c] : undefined;
      kept.push(old ?? makeCell(null, 'original'));
    }
  }
  for (const cell of cells) if (!kept.includes(cell)) disposeCell(cell);
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
  gl.render(host.scene, host.camera);
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
  }
  requestAnimationFrame(frame);
}

speakBtn.addEventListener('click', () => void speak());
byId('stop').addEventListener('click', stop);
colsEl.max = rowsEl.max = String(MAX_SIDE);
for (const input of [colsEl, rowsEl]) {
  input.addEventListener('change', () => applySize(clampSide(colsEl.valueAsNumber), clampSide(rowsEl.valueAsNumber)));
}
byId('resetLayout').addEventListener('click', () => {
  for (const cell of cells) disposeCell(cell);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved to clear.
  }
  loadLayout(null);
});

byId('addFile').addEventListener('click', () => fileEl.click());
fileEl.addEventListener('change', () => {
  for (const file of fileEl.files ?? []) {
    const id = String(nextFileId++);
    files.set(id, { url: URL.createObjectURL(file), label: file.name });
    for (const cell of cells) cell.modelEl.add(new Option(file.name, `file:${id}`));
    const empty = cells.find((c) => !c.modelEl.value);
    if (empty) setModel(empty, `file:${id}`);
    else alert(`${file.name} is added to every cell's model menu, but no cell is empty. Choose a cell and pick it there.`);
  }
  fileEl.value = '';
});

function loadLayout(text: string | null): void {
  const layout = parseLayout(text, isKnownModel);
  cols = layout.cols;
  rows = layout.rows;
  cells = layout.cells.map((c) => makeCell(c.model, c.mouth));
  showGrid();
}

function savedText(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

loadLayout(savedText());
void loadVoices().then(() => (speakBtn.disabled = false));
requestAnimationFrame(frame);
