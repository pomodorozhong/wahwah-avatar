# wahwah-avatar

Avatars for [wahwah](https://github.com/pomodorozhong/wahwah). This repository shows several models at once, each driven by the same wahwah performance.

## Run

```bash
npm install
npm run dev
```

The `wahwah` package comes from a [release tarball](https://github.com/pomodorozhong/wahwah/blob/main/docs/interface.md), so no Rust toolchain is needed. The playground renders one utterance, plays its audio once, and drives every cell of a grid from the same face-control track. Set the grid to up to 4 columns by 4 rows, and pick a model for each cell from its menu. The grid size and each cell's model, mouth and ink choices are saved in your browser as the active layout profile. The profile menu switches between named profiles, **New…** saves the current layout as another profile, **Delete** removes one, and **Reset layout** puts the active profile back to the default. The last entry of each cell's model menu, **Open .vrm file…**, opens a model from your computer into that cell; it never leaves the browser, and a file you opened is not restored after a reload. To list models at startup, put `.vrm` files under `app/public/models/` (git-ignored); they appear in each cell's model menu. The Pages build leaves that folder out and never lists it.

### Replacement mouths

A panel showing the VRoid "Constraint Twist" sample (`VRM1_Constraint_Twist_Sample.vrm`) gets a **Mouth** menu. **Replacement mouths** draws one of five cut-paper mouths in place of the model's own, held for a twelfth of a second. **Gesture-driven replacements** picks the drawing from the syllable rhythm. Other models and Tofu have no menu. The sample is not in this repository.

## Checks

```bash
npm run typecheck
npm test
npm run build
```
