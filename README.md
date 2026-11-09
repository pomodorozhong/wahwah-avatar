# wahwah-avatar

Avatars for [wahwah](https://github.com/pomodorozhong/wahwah). This repository shows several models at once, each driven by the same wahwah performance.

## Run

```bash
npm install
npm run dev
```

The `wahwah` package comes from a [release tarball](https://github.com/pomodorozhong/wahwah/blob/main/docs/interface.md), so no Rust toolchain is needed. The playground renders one utterance, plays its audio once, and drives every cell of a grid from the same face-control track. Each cell shows chips over its preview: the model name opens a menu of models (the last entry, **Open .vrm file…**, opens a model from your computer into that cell; it never leaves the browser and is not restored after a reload), and the sample model adds a mouth chip. The **Layout** button in the top bar opens one menu with the layout profiles (switch, delete, or add one with **New profile…**), a hover grid to set up to 4 columns by 4 rows, and **Reset this profile**. The active profile, with each cell's model, mouth and ink choices, is saved in your browser. To list models at startup, put `.vrm` files under `app/public/models/` (git-ignored); they appear in each cell's model menu. The Pages build leaves that folder out and never lists it.

### Replacement mouths

A panel showing the VRoid "Constraint Twist" sample (`VRM1_Constraint_Twist_Sample.vrm`) gets a **Mouth** menu. **Replacement mouths** draws one of five cut-paper mouths in place of the model's own, held for a twelfth of a second. **Gesture-driven replacements** picks the drawing from the syllable rhythm. Other models and Tofu have no menu. The sample is not in this repository.

## Checks

```bash
npm run typecheck
npm test
npm run build
```
