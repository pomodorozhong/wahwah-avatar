import { describe, expect, it } from 'vitest';
import { PlaybackClock } from '../src/shared/clock';

describe('PlaybackClock', () => {
  it('advances at the rate from the start position', () => {
    const clock = new PlaybackClock(10);
    clock.start(5, 1, 0.5);
    expect(clock.positionAt(5)).toBe(1);
    expect(clock.positionAt(7)).toBe(2);
  });

  it('stays between 0 and the duration', () => {
    const clock = new PlaybackClock(2);
    clock.start(1, 0, 1);
    expect(clock.positionAt(0.5)).toBe(0);
    expect(clock.positionAt(9)).toBe(2);
  });

  it('keeps the position continuous across a rate change and still answers for earlier times', () => {
    const clock = new PlaybackClock(10);
    clock.start(0, 0, 1);
    clock.setRate(2, 0.25);
    expect(clock.positionAt(2)).toBe(2);
    expect(clock.positionAt(6)).toBe(3);
    // The speakers lag the context clock: a time before the change uses the old rate.
    expect(clock.positionAt(1.5)).toBe(1.5);
  });

  it('is 0 before it is started', () => {
    expect(new PlaybackClock(3).positionAt(1)).toBe(0);
  });
});
