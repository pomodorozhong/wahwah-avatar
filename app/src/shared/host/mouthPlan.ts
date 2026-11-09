// Which replacement mouth to show, and when. Pure logic with no Three.js types,
// so the timing can be tested without a renderer.

import type { FaceControls } from 'wahwah/performance';

export const mouthModes = {
  original: 'Original VRM',
  plates: 'Replacement mouths',
  gesturePlates: 'Gesture-driven replacements',
} as const;

export type MouthMode = keyof typeof mouthModes;

/** How strongly the mouth is moving, from 0 (relaxed) to about 1. */
export function mouthEnergy(c: FaceControls): number {
  return Math.max(c.jawOpen, 0.72 * c.lipWidth, 0.65 * c.lipRound);
}

/** Drawings in the replacement set, in the order the mouth builds them. */
export const PLATE_CLOSED = 0;
export const PLATE_MID = 1;
export const PLATE_OPEN = 2;
export const PLATE_WIDE = 3;
export const PLATE_ROUND = 4;

export function plateIndex(c: FaceControls): number {
  if (mouthEnergy(c) < 0.12) return PLATE_CLOSED;
  if (c.lipRound > 0.38) return PLATE_ROUND;
  if (c.lipWidth > 0.44) return PLATE_WIDE;
  return c.jawOpen > 0.48 ? PLATE_OPEN : PLATE_MID;
}

/** Each drawing is held for a twelfth of a second, as on twos. */
export const PLATE_HOLD = 1 / 12;

/** Holds a chosen drawing for PLATE_HOLD seconds; a near-closed mouth re-picks at once. */
export class PlateHold {
  private hold = 0;
  private index = PLATE_CLOSED;

  next(c: FaceControls, dt: number, reset: boolean): number {
    this.hold -= dt;
    if (reset || this.hold <= 0 || mouthEnergy(c) < 0.035) {
      this.index = plateIndex(c);
      this.hold = PLATE_HOLD;
    }
    return this.index;
  }
}

/** Frames of one reference beat: the broad grin, then the round-mouth gesture. */
export const grinFrames = [0, 1, 1, 2, 2, 1, 2, 1, 1, 3];
export const roundFrames = [4, 5, 5, 6, 6];

/** Match each replay frame to a drawing. The three rounded frames share the O drawing and change its proportions. */
export const replayPlates = [
  { plate: 1, width: 1, height: 1 },
  { plate: 2, width: 1, height: 1 },
  { plate: 3, width: 1, height: 1 },
  { plate: 1, width: 1.08, height: 1 },
  { plate: 4, width: 1.1, height: 0.84 },
  { plate: 4, width: 0.86, height: 1.06 },
  { plate: 4, width: 1.12, height: 0.78 },
];

/** Start a reference beat on each rising syllable and stretch it to the syllable. */
export class GestureReplay {
  private gestureTime = Infinity;
  private peak = 0;
  private lastEnergy = 0;
  private rising = false;
  private frames = grinFrames;

  /** The replay frame to show, or null while the mouth is at rest. */
  frame(c: FaceControls, dt: number, reset: boolean): number | null {
    const energy = mouthEnergy(c);
    if (reset || energy < 0.04) {
      this.gestureTime = Infinity;
      this.lastEnergy = 0;
      this.rising = false;
    }
    if (energy < 0.04) return null;
    const rising = energy > this.lastEnergy + 0.005;
    if ((rising && !this.rising && this.gestureTime > 0.13) || this.lastEnergy === 0) {
      this.gestureTime = 0;
      this.peak = energy;
      this.frames = c.lipRound > c.lipWidth + 0.18 ? roundFrames : grinFrames;
    }
    if (Math.abs(energy - this.lastEnergy) > 0.005) this.rising = rising;
    this.lastEnergy = energy;
    this.peak = Math.max(this.peak, energy);
    this.gestureTime += dt;
    const rate = 12 * (1 + this.peak * 1.4);
    return this.frames[Math.min(this.frames.length - 1, Math.floor(this.gestureTime * rate))];
  }
}
