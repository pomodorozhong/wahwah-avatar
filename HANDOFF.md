# Handoff

## In progress

Split step 3 is built as a four-branch stack of local branches, bottom to top. Nothing is pushed and no PR exists. The stack is tracked by `gh stack` (`gh stack view`). Publishing is `gh stack submit`, which needs the user's review and approval first (P-01). The playground UI redesign (formerly the `temp/layout-fit` branch) is folded into PR 2 and PR 4.

### feat/grid-layout-editor

- **Task:** a saved grid layout editor (up to 4 columns by 4 rows; each cell holds a model and a mouth). No issue; it came from the user's request.
- **Position:** 2 of 4, based on `feat/replacement-mouths`.
- **Code checkpoint:** `f40ca1d`.
- **State:** awaiting review. Replaces the Add Tofu and Add local buttons with per-cell model menus, and holds the layout redesign: a one-row header and no page scroll, a hover-grid size picker, named layout profiles (with each profile's grid size in the list), "Open .vrm file…" in the model menu, and floating chips with custom menus (`app/src/playground/menu.ts`). A file opened from disk is not saved with the layout. Hidden cell choices from shrinking live only until reload.
- **Verified:** `npm run typecheck`, `npm test` (33 tests) and `npm run build` pass after the rebuild. Not re-checked in the browser since the rebuild; the earlier browser check (before the layout redesign was folded in) was: built a 3x3 grid, reloaded and got it back, shrank it to 2x2 with cells kept, and reset it. The startup Local models list also showed the `.vrm` files in `app/public/models/vrm/`.
- **Next:** review, then P-01.

### feat/optional-mouth-modes

- **Task:** Sculpted lips, Ink contour, Hinged jaw and Gesture replay for the Constraint Twist sample (split step 3).
- **Position:** 3 of 4.
- **Code checkpoint:** `66baee9`.
- **State:** awaiting review. The shader patches have no automated test; the control mappings do.
- **Verified:** checks pass (38 tests after the rebuild). In the browser, before the rebuild: Ink contour, Sculpted lips and Gesture replay drew a moving mouth with no shader errors. Hinged jaw loaded with no errors, but I never caught an open mouth in a frame, so its look is not confirmed.
- **Next:** review; check Hinged jaw by eye.

### feat/replacement-mouths

- **Task:** the replacement mouths for the Constraint Twist sample (split step 3, first).
- **Position:** 1 of 4, based on `main`.
- **Code checkpoint:** `66b257b`.
- **State:** awaiting review. Only a model whose face mesh matches the sample gets a Mouth menu.
- **Verified:** checks pass (21 tests). In the browser: both replacement modes drew and animated the sample, Tofu had no menu, and the console was clean.
- **Next:** review, then P-01.

### feat/visual-styles

- **Task:** painted-toon, ink-dither and comic-print styles, and `npm run models:styles` (split step 3, last).
- **Position:** 4 of 4. Also holds this handoff commit.
- **Code checkpoint:** `e9b10d3`.
- **State:** awaiting review. Adds the ink dither chip to the new floating chips. A model file picks its look through `wahwahRenderStyle` in its asset extras.
- **Verified:** checks pass (39 tests after the rebuild). In the browser, before the rebuild: a 2x2 grid of the three style variants and the original sample, side by side, with mouth modes working on the styled variants. The ink dither menu appears only on the ink model; I did not click through each dither method.
- **Not run:** `npm run models:styles` itself; the variants I used came from the local zip.
- **P-01:** publish all four branches as stacked PRs with `gh stack submit`. A request, not an approval; it waits on the user's review of the stack and blocks every PR in it.
- **Next:** review, then P-01.

## Ranked work

1. Review the stack above and then publish (P-01). After it merges, delete the local `experiments/` copy; its code is now in the repository.
2. Run the line-boil experiment ([#3](https://github.com/pomodorozhong/wahwah-avatar/issues/3)) and the visual style comparison ([#4](https://github.com/pomodorozhong/wahwah-avatar/issues/4)) in the new grid. The stack adds the tooling; the experiments and their write-ups are still open.
3. Add the OBS overlay as a second page of this Vite project (an OBS Browser Source, shared code in `app/src/shared/`), then the Twitch integration. Decided over Electron or a native engine for the first version; it needs the hash-voice interface on wahwah's roadmap for per-viewer voices.
4. Support Syphon output for OBS on macOS ([#1](https://github.com/pomodorozhong/wahwah-avatar/issues/1)). The Browser Source overlay comes first; the sender and project structure are open questions in the issue.
5. Move from the tarball to the published package once wahwah is on npm ([pomodorozhong/wahwah#25](https://github.com/pomodorozhong/wahwah/issues/25)).

## Pending

None.
