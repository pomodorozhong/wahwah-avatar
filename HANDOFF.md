# Handoff

## In progress

### feat/model-playground

- Task: first PR for this repository: the model playground, the Tofu tests, the Pages workflow and the project docs. Related to [pomodorozhong/wahwah#23](https://github.com/pomodorozhong/wahwah/issues/23); closes none. The branch is not linked to an issue.
- PR: none yet. `main` holds the license, `.gitignore` and a README stub (`2d770b7`).
- Code checkpoint: `3b94baa` (playground), `003fc73` (workflow).
- State: the playground renders Tofu in several panels from one shared renderer and plays one utterance across all of them. Opened `.vrm` files stay in the browser. Not pushed.
- Verification: `npm run typecheck`, `npm test` (10 tests), `npm run build` and `npm run build:pages` passed. In the browser, 25 Tofu panels rendered with no blank panels. Not checked: mouth and audio sync, opening a `.vrm` file, orbit and zoom by hand, and the Pages workflow.
- Next action: you review the final diff and approve **P-01**.
- Pending: **P-01** push this branch and open a PR. Why: pushing needs approval. Blocks: review.
- Do not: commit model archives (`models/`, `*.zip`, `*.vrm` other than `public/tofu/corner-cut.vrm`). Do not hard-wrap Markdown.

## Ranked work

1. Enable GitHub Pages for this repository (Settings, Pages, source: GitHub Actions) so the workflow can deploy. This is a repository setting for you to change.
2. Move the model picking and generic VRM support out of wahwah, then remove them there ([avatar split plan](https://github.com/pomodorozhong/wahwah/blob/main/docs/avatar-split.md), steps 1, 2, 4 and 5). Transfer wahwah issues #6 and #11 first.
3. Bring in the visual and mouth experiments (split step 3). The sources are kept locally in `experiments/`, copied from `codex/backup-puppet-experiments-2026-11-02` at `4442a8c` in wahwah; they target the old layout and are not committed.
4. Add the OBS overlay as a second page of this Vite project (an OBS Browser Source, shared code in `src/shared/`), then the Twitch integration. Decided over Electron or a native engine for the first version; it needs the hash-voice interface on wahwah's roadmap for per-viewer voices. It needs the hash-voice interface on wahwah's roadmap.
5. Support Syphon output for OBS on macOS ([#1](https://github.com/pomodorozhong/wahwah-avatar/issues/1)). The Browser Source overlay comes first; the sender and project structure are open questions in the issue.
6. Move from the tarball to the published package once wahwah is on npm ([pomodorozhong/wahwah#25](https://github.com/pomodorozhong/wahwah/issues/25)).

## Pending

None.
