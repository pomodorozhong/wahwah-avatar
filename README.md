# wahwah-avatar

Avatars for [wahwah](https://github.com/pomodorozhong/wahwah). This repository shows several models at once, each driven by the same wahwah performance.

## Run

```bash
npm install
npm run dev
```

The `wahwah` package comes from a [release tarball](https://github.com/pomodorozhong/wahwah/blob/main/docs/interface.md), so no Rust toolchain is needed. The playground renders one utterance, plays its audio once, and drives every panel from the same face-control track. **Add .vrm file…** opens a model from your computer; it never leaves the browser. To list models at startup, put `.vrm` files under `app/public/models/` (git-ignored); they appear under **Local models** with an **Add** button. The Pages build leaves that folder out and never lists it.

### Replacement mouths

A panel showing the VRoid "Constraint Twist" sample (`VRM1_Constraint_Twist_Sample.vrm`) gets a **Mouth** menu. **Replacement mouths** draws one of five cut-paper mouths in place of the model's own, held for a twelfth of a second. **Gesture-driven replacements** picks the drawing from the syllable rhythm. Other models and Tofu have no menu. The sample is not in this repository.

## Checks

```bash
npm run typecheck
npm test
npm run build
```
