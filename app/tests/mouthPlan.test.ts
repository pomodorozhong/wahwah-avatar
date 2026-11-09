import { describe, expect, it } from 'vitest';
import {
  GestureReplay, PLATE_CLOSED, PLATE_HOLD, PLATE_MID, PLATE_OPEN, PLATE_ROUND, PLATE_WIDE,
  PlateHold, blendControls, gestureScale, grinFrames, hingeAngle, hingeControls, mouthModes, plateIndex, replayPlates, roundFrames,
} from '../src/shared/host/mouthPlan';

const c = (jawOpen: number, lipWidth = 0, lipRound = 0) => ({ jawOpen, lipWidth, lipRound });

describe('plateIndex', () => {
  it('picks a drawing from the controls', () => {
    expect(plateIndex(c(0))).toBe(PLATE_CLOSED);
    expect(plateIndex(c(0.3))).toBe(PLATE_MID);
    expect(plateIndex(c(0.7))).toBe(PLATE_OPEN);
    expect(plateIndex(c(0.2, 0.6))).toBe(PLATE_WIDE);
    expect(plateIndex(c(0.2, 0, 0.5))).toBe(PLATE_ROUND);
  });
});

describe('PlateHold', () => {
  it('keeps a drawing for a twelfth of a second', () => {
    const hold = new PlateHold();
    expect(hold.next(c(0.3), 0, true)).toBe(PLATE_MID);
    expect(hold.next(c(0.7), PLATE_HOLD / 2, false)).toBe(PLATE_MID);
    expect(hold.next(c(0.7), PLATE_HOLD, false)).toBe(PLATE_OPEN);
  });

  it('closes at once when the mouth relaxes', () => {
    const hold = new PlateHold();
    hold.next(c(0.7), 0, true);
    expect(hold.next(c(0), 0.001, false)).toBe(PLATE_CLOSED);
  });
});

describe('GestureReplay', () => {
  it('shows nothing while the mouth is at rest', () => {
    expect(new GestureReplay().frame(c(0), 0.016, false)).toBeNull();
  });

  it('plays the grin beat for a spread mouth, then holds its last frame', () => {
    const replay = new GestureReplay();
    expect(replay.frame(c(0.6, 0.5), 0, false)).toBe(grinFrames[0]);
    let frame: number | null = null;
    for (let i = 0; i < 100; i++) frame = replay.frame(c(0.6, 0.5), 0.016, false);
    expect(frame).toBe(grinFrames[grinFrames.length - 1]);
  });

  it('plays the round beat when the lips round', () => {
    expect(roundFrames).toContain(new GestureReplay().frame(c(0.4, 0, 0.8), 0, false));
  });

  it('only names frames that have a drawing', () => {
    for (const frame of [...grinFrames, ...roundFrames]) expect(replayPlates[frame]).toBeDefined();
  });
});

describe('blendControls', () => {
  it('keeps a closed mouth closed', () => {
    expect(blendControls(c(0))).toEqual({ jawOpen: 0, lipRound: 0, lipWidth: 0 });
  });

  it('never lets the lips spread past what rounding leaves free', () => {
    for (const round of [0, 0.25, 1]) {
      const out = blendControls(c(1, 1, round));
      expect(out.lipWidth + out.lipRound).toBeLessThanOrEqual(1 + 1e-9);
      expect(out.jawOpen).toBeLessThanOrEqual(1);
    }
  });
});

describe('hinge mode', () => {
  it('shares the opening between the morphs and the hinge', () => {
    expect(hingeControls(c(1, 1, 1))).toEqual({ jawOpen: 0.7, lipWidth: 0.45, lipRound: 0.45 });
    expect(hingeAngle(c(0))).toBe(0);
    expect(hingeAngle(c(1))).toBeCloseTo(0.2);
  });
});

describe('gestureScale', () => {
  it('grows from a soft to a full syllable', () => {
    expect(gestureScale(c(0))).toBeCloseTo(0.57);
    expect(gestureScale(c(1))).toBeCloseTo(1);
    expect(gestureScale(c(0.25))).toBeGreaterThan(gestureScale(c(0.04)));
  });
});

describe('mouthModes', () => {
  it('lists the original mouth first', () => {
    expect(Object.keys(mouthModes)[0]).toBe('original');
  });

  it('names every mode the playground can pick', () => {
    expect(Object.keys(mouthModes)).toEqual(['original', 'plates', 'gesturePlates', 'blend', 'contour', 'hinge', 'gesture']);
  });
});
