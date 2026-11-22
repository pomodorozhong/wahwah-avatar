# wahwah-avatar

Avatars for [wahwah](https://github.com/pomodorozhong/wahwah). This repository shows several models at once, each driven by the same wahwah performance.

## Run

```bash
npm install
npm run dev
```

The `wahwah` package comes from a [release tarball](https://github.com/pomodorozhong/wahwah/blob/main/docs/interface.md), so no Rust toolchain is needed. The playground renders one utterance, plays its audio once, and drives every cell of a grid from the same face-control track. Each cell shows chips over its preview: the model name opens a menu of models (the last entry, **Open .vrm file…**, opens a model from your computer into that cell; it never leaves the browser and is not restored after a reload), a style chip picks how the model is drawn, and Tofu and the sample model add a mouth chip. The **Layout** button in the top bar opens one menu with the layout profiles (switch, delete, or add one with **New profile…**), two showcase profiles, a hover grid to set up to 4 columns by 4 rows, and **Reset this profile**. A first visit opens on **Tofu styles**, a 3 × 2 grid of Tofu in each visual style; **Show every Tofu style** brings it back. **Show every Tofu mouth** opens **Mouths**, Tofu in each mouth mode. The active profile, with each cell's model, mouth, style and ink choices, is saved in your browser. The **Settings** button next to it opens a panel under the top bar: playback speed (0.25×, 0.5×, 1× or 2×; the audio's pitch shifts with it), a timeline with a play and pause button and a playhead you can drag, before the first **Speak** too, to show the pose at that moment in every cell (silently, also after playback has ended), and **Sync view** (on by default), which mirrors orbit, pan and zoom in one cell into all the others. The page renders an utterance ahead of time, on load and after a text edit, so the timeline works before **Speak**; **Speak** plays that utterance, and once it has been spoken the next **Speak** renders a new variation. The speed, the sync choice and whether the panel is open are saved for the whole page, not per profile. To list models at startup, put `.vrm` files under `app/public/models/` (git-ignored); they appear in each cell's model menu. The Pages build leaves that folder out and never lists it.

### Replacement mouths

Tofu and the VRoid "Constraint Twist" sample (`VRM1_Constraint_Twist_Sample.vrm`) get a **Mouth** menu. **Replacement mouths** draws one of five cut-paper mouths in place of the model's own, held for a twelfth of a second. **Gesture-driven replacements** picks the drawing from the syllable rhythm. Four more modes change the model's own mouth with shader patches: **Sculpted lips** (a crisp seal and broader tooth-bearing spread), **Ink contour** (an outlined mouth drawn on the skin), **Hinged jaw** (the chin tips on a hinge) and **Gesture replay** (frames traced from a reference animation, stretched to each syllable). On Tofu the drawn mouths sit on its front face and the contour is painted on its skin; sculpted lips and hinged jaw drive Tofu's own hinged mouth with the same weights as on the sample, without the sample's lip paint or chin shader. Other models have no menu. The sample is not in this repository.

### Visual styles

A model file can ask for a look by setting `wahwahRenderStyle` in its glTF asset extras: `painted-toon` (flat pigments, brush variation), `ink-dither` (one-bit ink on paper, with a dither menu in the cell) or `comic-print` (halftone dots, hatching and a print registration offset). The playground applies the look when it loads the model. A cell's style chip overrides it with any of the looks, for any model, Tofu included. `npm run models:styles` rebuilds the three variants from the sample into `app/public/models/vrm/` (it changes only material settings and metadata, and the output stays git-ignored). Pass a source path, a destination folder and a thumbnails folder as arguments to change the defaults.

## Checks

```bash
npm run typecheck
npm test
npm run build
```
