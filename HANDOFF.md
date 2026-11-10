# Handoff

## In progress

### docs/architecture-docs

- Task: two docs pages, [architecture.md](docs/architecture.md) and [procedural-animation.md](docs/procedural-animation.md), for [#11](https://github.com/pomodorozhong/wahwah-avatar/issues/11). The commits say `Related to #11`. The branch is not linked to the issue, since the PR will not resolve it.
- PR: [#12](https://github.com/pomodorozhong/wahwah-avatar/pull/12), open. Its last code commit is `fcbb1e5`, which draws the flow in `architecture.md` as a Mermaid diagram (checked: it parses and renders with Mermaid 11). Its body says `Related to #11` and closes no issue (checked: `closingIssuesReferences` is empty). Auto-fix is on.
- Code checkpoint: `4021106`, rebased on `main` at `1f919a4` (after [#9](https://github.com/pomodorozhong/wahwah-avatar/pull/9) merged). Four commits: the two pages, an "Inside the face host" section that sorts `app/src/shared/host/` into the host itself, motion computed live and visual styles, and a fix to the `host.ts` comment that named a missing `renderer.ts`.
- State: awaiting review. The host and motion claims were checked against the code; every file the pages name exists on `main`.
- Verified: `npm run typecheck`, `npm test` (39 tests) and `npm run build` pass on `47298a4`; `fcbb1e5` changes only a Markdown file.
- Open question: should `README.md` and `goals.md` link to `architecture.md`, as #11 proposes? Left out of #12 on purpose; still open in #11.
- Next action: review and merge #12. Merging needs your OK.

## Ranked work

1. Review and merge the docs PR [#12](https://github.com/pomodorozhong/wahwah-avatar/pull/12), then settle the file structure in [#11](https://github.com/pomodorozhong/wahwah-avatar/issues/11).
2. Delete the local `experiments/` copy now that [#9](https://github.com/pomodorozhong/wahwah-avatar/pull/9) has merged; its code is in the repository. It is untracked, so this needs your OK.
3. Check the grid UI in a browser on `main`: the layout redesign was rebuilt into #7 and was only checked with typecheck, tests and build after the rebuild. Not checked: "Open .vrm file…", a 4 x 4 grid, narrow windows, `npm run build:pages`. The ink chip menu was checked on the #9 branch before it merged.
4. Run the line-boil experiment ([#3](https://github.com/pomodorozhong/wahwah-avatar/issues/3)) and the visual style comparison ([#4](https://github.com/pomodorozhong/wahwah-avatar/issues/4)) in the new grid.
5. Small follow-ups from the #9 review, none urgent: the comic print halftone is six device pixels, not six CSS pixels as its comment says, so it is finer on Retina screens; saved ink and mouth values are checked with `in`, which also accepts names like `toString`; the shared style passes resize their target per cell, which rebuilds it every frame if styled cells ever differ in size.
6. Enable GitHub Pages for this repository (Settings, Pages, source: GitHub Actions) so the workflow can deploy, if it is not enabled yet. This is a repository setting for you to change.
7. Remove the model picking and generic VRM support from wahwah now that the startup list has merged here ([avatar split plan](https://github.com/pomodorozhong/wahwah/blob/main/docs/avatar-split.md), steps 4 and 5). Transfer wahwah issues #6 and #11 first.
8. Add the OBS overlay as a second page of this Vite project (an OBS Browser Source, shared code in `app/src/shared/`), then the Twitch integration. Decided over Electron or a native engine for the first version; it needs the hash-voice interface on wahwah's roadmap for per-viewer voices.
9. Support Syphon output for OBS on macOS ([#1](https://github.com/pomodorozhong/wahwah-avatar/issues/1)). The Browser Source overlay comes first; the sender and project structure are open questions in the issue.
10. Move from the tarball to the published package once wahwah is on npm ([pomodorozhong/wahwah#25](https://github.com/pomodorozhong/wahwah/issues/25)).

## Pending

None.
