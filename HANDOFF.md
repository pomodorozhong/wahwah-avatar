# Handoff

## In progress

### feat/startup-local-models

- Task: split step 2. Port the startup `public/models` list from wahwah. Closes no issue and is not linked to one.
- PR: none yet. Not pushed.
- Code checkpoint: `7e815db`. Lists `.vrm` files under `app/public/models/` as **Local models** with an **Add** button. The Pages build turns `publicDir` off, emits only Tofu and gets an empty list.
- Verification: `npm run typecheck`, `npm test`, `npm run build` and `npm run build:pages` passed. With a model file in `app/public/models/`, the normal build copied it and Pages neither copied nor listed it. The picker in a browser was not run.
- Next action: you review and approve pushing this branch and opening the PR. After it merges, remove the picker, local loading and generic VRM path from wahwah (split steps 4 and 5).

## Ranked work

1. Enable GitHub Pages for this repository (Settings, Pages, source: GitHub Actions) so the workflow can deploy. This is a repository setting for you to change.
2. Remove the model picking and generic VRM support from wahwah once the startup list has merged here ([avatar split plan](https://github.com/pomodorozhong/wahwah/blob/main/docs/avatar-split.md), steps 1, 2, 4 and 5). Transfer wahwah issues #6 and #11 first.
3. Bring in the visual and mouth experiments (split step 3). The sources are kept locally in `experiments/`, copied from `codex/backup-puppet-experiments-2026-11-02` at `4442a8c` in wahwah; they target the old layout and are not committed.
4. Add the OBS overlay as a second page of this Vite project (an OBS Browser Source, shared code in `app/src/shared/`), then the Twitch integration. Decided over Electron or a native engine for the first version; it needs the hash-voice interface on wahwah's roadmap for per-viewer voices. It needs the hash-voice interface on wahwah's roadmap.
5. Support Syphon output for OBS on macOS ([#1](https://github.com/pomodorozhong/wahwah-avatar/issues/1)). The Browser Source overlay comes first; the sender and project structure are open questions in the issue.
6. Move from the tarball to the published package once wahwah is on npm ([pomodorozhong/wahwah#25](https://github.com/pomodorozhong/wahwah/issues/25)).

## Pending

None.
