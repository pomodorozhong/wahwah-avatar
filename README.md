# wahwah-avatar

Avatars for [wahwah](https://github.com/pomodorozhong/wahwah). This repository shows several models at once, each driven by the same wahwah performance.

## Run

```bash
npm install
npm run dev
```

The `wahwah` package comes from a [release tarball](https://github.com/pomodorozhong/wahwah/blob/main/docs/interface.md), so no Rust toolchain is needed. The playground renders one utterance, plays its audio once, and drives every panel from the same face-control track. **Add .vrm file…** opens a model from your computer; it never leaves the browser.

## Checks

```bash
npm run typecheck
npm test
npm run build
```
