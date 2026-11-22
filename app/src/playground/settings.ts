// Page-wide playground settings: playback speed, synced cell views, and
// whether the settings panel is open. Saved once for the page, not per profile.

export const SETTINGS_KEY = 'wahwah-avatar.settings.v1';

/** The speeds the panel offers. */
export const SPEEDS = [0.25, 0.5, 1, 2] as const;

export interface Settings {
  speed: number;
  /** Zoom, pan and orbit in one cell move every cell. */
  sync: boolean;
  panelOpen: boolean;
}

export const defaultSettings = (): Settings => ({ speed: 1, sync: false, panelOpen: false });

export const serializeSettings = (settings: Settings): string => JSON.stringify(settings);

/** Read saved settings; anything missing or unreadable keeps its default. */
export function parseSettings(text: string | null): Settings {
  const settings = defaultSettings();
  if (!text) return settings;
  try {
    const data = JSON.parse(text) as Partial<Record<keyof Settings, unknown>>;
    if (typeof data.speed === 'number' && (SPEEDS as readonly number[]).includes(data.speed)) settings.speed = data.speed;
    if (typeof data.sync === 'boolean') settings.sync = data.sync;
    if (typeof data.panelOpen === 'boolean') settings.panelOpen = data.panelOpen;
  } catch {
    // Keep the defaults.
  }
  return settings;
}

/** `1.25 / 3.40 s` for the timeline readout. */
export const formatTime = (position: number, duration: number): string =>
  `${position.toFixed(2)} / ${duration.toFixed(2)} s`;
