// The dither methods the one-bit ink style can use. Pure data, so a saved layout can be checked against it.

export const inkMethods = {
  bayer: { label: 'Ordered (Bayer)', strength: 1, levels: 2, clustered: false },
  clustered: { label: 'Clustered dots', strength: 1, levels: 2, clustered: true },
  reduced: { label: 'Reduced dither', strength: 0.35, levels: 2, clustered: false },
  threshold: { label: 'Solid ink (no dither)', strength: 0, levels: 2, clustered: false },
  fourTone: { label: 'Four tones (no dither)', strength: 0, levels: 4, clustered: false },
} as const;

export type InkMethod = keyof typeof inkMethods;
