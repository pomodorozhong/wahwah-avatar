// The visual styles a playground cell can ask for. Pure data, so a saved layout can be checked against it.

import type { RenderStyle } from './host';

/** `model` keeps the style the model file asks for; the rest override it. */
export const styleChoices = {
  model: "Model's own style",
  standard: 'Standard',
  'painted-toon': 'Painted toon',
  'ink-dither': 'Ink dither',
  'comic-print': 'Comic print',
} as const satisfies Record<'model' | RenderStyle, string>;

export type StyleChoice = keyof typeof styleChoices;
