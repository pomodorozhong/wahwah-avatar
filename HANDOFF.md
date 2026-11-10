# Handoff

## In progress

### feat/visual-styles

- **Task:** painted-toon, ink-dither and comic-print styles, and `npm run models:styles` (split step 3, last). No issue.
- **PR:** [#9](https://github.com/pomodorozhong/wahwah-avatar/pull/9), open against `main`.
- **Code checkpoint:** `b0340de`, directly on `main` at `3496671` (after [#6](https://github.com/pomodorozhong/wahwah-avatar/pull/6), [#7](https://github.com/pomodorozhong/wahwah-avatar/pull/7) and [#8](https://github.com/pomodorozhong/wahwah-avatar/pull/8) were squash-merged). The branch was rebuilt on `main`, so the PR holds only its own changes; GitHub reports it as mergeable.
- **State:** awaiting review and merge. Adds the ink dither chip to the floating chips. A model file picks its look through `wahwahRenderStyle` in its asset extras.
- **Verified:** `npm run typecheck`, `npm test` (39 tests) and `npm run build` pass on `b0340de`. In the browser, before the rebuild only: a 2x2 grid of the three style variants and the original sample, side by side, with mouth modes working on the styled variants. The ink dither menu appeared only on the ink model.
- **Not checked:** the browser since the rebuild; clicking through each ink dither method; `npm run models:styles` itself (the variants used came from the local zip).
- **Next:** you review and merge #9.

## Ranked work

1. Review and merge [#9](https://github.com/pomodorozhong/wahwah-avatar/pull/9). After it merges, delete the local `experiments/` copy; its code is now in the repository.
2. Open the docs PR from `docs/architecture-docs` once you approve it, and settle the file structure in [#11](https://github.com/pomodorozhong/wahwah-avatar/issues/11).
3. Check the grid UI in a browser on `main`: the layout redesign was rebuilt into #7 and was only checked with typecheck, tests and build after the rebuild. Not checked: the ink chip menu (comes with #9), "Open .vrm file…", a 4 x 4 grid, narrow windows, `npm run build:pages`.
4. Run the line-boil experiment ([#3](https://github.com/pomodorozhong/wahwah-avatar/issues/3)) and the visual style comparison ([#4](https://github.com/pomodorozhong/wahwah-avatar/issues/4)) in the new grid.
5. Enable GitHub Pages for this repository (Settings, Pages, source: GitHub Actions) so the workflow can deploy, if it is not enabled yet. This is a repository setting for you to change.
6. Remove the model picking and generic VRM support from wahwah now that the startup list has merged here ([avatar split plan](https://github.com/pomodorozhong/wahwah/blob/main/docs/avatar-split.md), steps 4 and 5). Transfer wahwah issues #6 and #11 first.
7. Add the OBS overlay as a second page of this Vite project (an OBS Browser Source, shared code in `app/src/shared/`), then the Twitch integration. Decided over Electron or a native engine for the first version; it needs the hash-voice interface on wahwah's roadmap for per-viewer voices.
8. Support Syphon output for OBS on macOS ([#1](https://github.com/pomodorozhong/wahwah-avatar/issues/1)). The Browser Source overlay comes first; the sender and project structure are open questions in the issue.
9. Move from the tarball to the published package once wahwah is on npm ([pomodorozhong/wahwah#25](https://github.com/pomodorozhong/wahwah/issues/25)).

## Pending

None.
