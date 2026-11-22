import { describe, expect, it } from 'vitest';
import { defaultSettings, formatTime, parseSettings, serializeSettings } from '../src/playground/settings';

describe('parseSettings', () => {
  it('gives the defaults for nothing saved or unreadable text', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('not json')).toEqual(defaultSettings());
    expect(parseSettings('[]')).toEqual(defaultSettings());
  });

  it('round-trips saved settings', () => {
    const settings = { speed: 0.25, sync: false, panelOpen: true };
    expect(parseSettings(serializeSettings(settings))).toEqual(settings);
  });

  it('drops a speed the panel does not offer and values of the wrong type', () => {
    expect(parseSettings(JSON.stringify({ speed: 3, sync: 'yes', panelOpen: true }))).toEqual({ speed: 1, sync: true, panelOpen: true });
  });
});

describe('formatTime', () => {
  it('shows the position and duration in seconds', () => {
    expect(formatTime(1.254, 3.4)).toBe('1.25 / 3.40 s');
  });
});
