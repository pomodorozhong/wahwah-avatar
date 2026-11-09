// Model playground: render one wahwah utterance, play its audio once, and
// drive every model panel from the same face-control track on one clock.

import { DEFAULT_VOICE, loadVoices, renderMumble } from 'wahwah';
import { sampleFaceTrack, type RenderedUtterance } from 'wahwah/performance';
import { Player } from '../shared/playback';
import * as THREE from 'three';
import { VrmFace } from '../shared/host/vrm';
import { ControlFollower } from '../shared/host/follower';
import { mouthModes, type MouthMode } from '../shared/host/mouthPlan';
import localModels from 'virtual:local-models';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = byId<HTMLElement>('grid');
const textEl = byId<HTMLInputElement>('text');
const speakBtn = byId<HTMLButtonElement>('speak');
const fileEl = byId<HTMLInputElement>('file');

// Browsers cap live WebGL contexts (about 16, fewer on some), and the oldest
// is lost when the cap is hit. So every panel shares one offscreen renderer
// and copies its frame onto its own 2D canvas.
const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });

interface Panel {
  host: VrmFace;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  statusEl: HTMLElement;
  mouthEl: HTMLSelectElement;
  dispose(): void;
}

function renderPanel(panel: Panel, dt: number): void {
  const { canvas, host } = panel;
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
  panel.ctx.drawImage(gl.domElement, 0, 0);
}

const TOFU_URL = `${import.meta.env.BASE_URL}tofu/corner-cut.vrm`;
const panels = new Set<Panel>();
const follower = new ControlFollower();
let player: Player | null = null;
let track: RenderedUtterance['track'] = null;
let seed = 1;

function addPanel(source: { url: string; label: string; tofu: boolean; revoke?: boolean }): void {
  const el = document.createElement('section');
  el.className = 'panel';
  el.innerHTML = '<div class="head"><span></span><select aria-label="Mouth" hidden></select><button type="button">Remove</button></div><div class="stageview"><div class="status"></div></div>';
  const [labelEl, removeBtn] = [el.querySelector('span')!, el.querySelector('button')!];
  const mouthEl = el.querySelector('select')!;
  mouthEl.replaceChildren(...Object.entries(mouthModes).map(([mode, label]) => new Option(label, mode)));
  const view = el.querySelector<HTMLElement>('.stageview')!;
  const statusEl = view.querySelector<HTMLElement>('.status')!;
  const canvas = document.createElement('canvas');
  view.prepend(canvas);
  labelEl.textContent = source.label;
  grid.appendChild(el);

  const host = new VrmFace();
  host.navigation.connect(canvas);
  mouthEl.addEventListener('change', () => (host.mouthMode = mouthEl.value as MouthMode));
  const panel: Panel = {
    host,
    canvas,
    ctx: canvas.getContext('2d')!,
    statusEl,
    mouthEl,
    dispose() {
      host.navigation.dispose();
      if (source.revoke) URL.revokeObjectURL(source.url);
      el.remove();
      panels.delete(panel);
    },
  };
  panels.add(panel);
  removeBtn.addEventListener('click', () => panel.dispose());
  void host.load(source.url, source.label, source.tofu);
}

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
  for (const panel of panels) {
    panel.host.setControls(follower.controls);
    renderPanel(panel, dt);
    panel.statusEl.textContent = panel.host.status;
    panel.mouthEl.hidden = !panel.host.puppetMouth;
  }
  requestAnimationFrame(frame);
}

speakBtn.addEventListener('click', () => void speak());
byId('stop').addEventListener('click', stop);
byId('addTofu').addEventListener('click', () => addPanel({ url: TOFU_URL, label: 'Tofu', tofu: true }));
byId('addFile').addEventListener('click', () => fileEl.click());
fileEl.addEventListener('change', () => {
  for (const file of fileEl.files ?? []) {
    addPanel({ url: URL.createObjectURL(file), label: file.name, tofu: false, revoke: true });
  }
  fileEl.value = '';
});

if (localModels.vrm.length) {
  const select = byId<HTMLSelectElement>('local');
  const name = (f: string) => f.split('/').pop()!.replace(/\.vrm$/i, '');
  select.replaceChildren(...localModels.vrm.map((f) => new Option(name(f), f)));
  byId('localLabel').hidden = false;
  byId('addLocal').hidden = false;
  byId('addLocal').addEventListener('click', () => {
    const file = select.value;
    addPanel({ url: `${import.meta.env.BASE_URL}models/${file}`, label: name(file), tofu: false });
  });
}

addPanel({ url: TOFU_URL, label: 'Tofu', tofu: true });
void loadVoices().then(() => (speakBtn.disabled = false));
requestAnimationFrame(frame);
