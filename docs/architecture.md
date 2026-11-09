# Architecture

How the pieces fit together. For what this repository owns and what it does not, see [goals.md](goals.md).

## The flow

```
text ──► wahwah ──► audio + FaceControlTrack ──► playback clock ──► follower ──► face host ──► picture
```

1. **wahwah** (the `wahwah` package) turns text into a rendered utterance: audio, plus a `FaceControlTrack` that says how the face should move over time. This repository does not make speech or timing.
2. **Playback** (`app/src/shared/playback.ts`) plays the audio and keeps one clock. The face reads the same clock, so the picture stays in step with the sound.
3. **The follower** (`app/src/shared/host/follower.ts`) holds the current face controls and returns them to neutral when speech stops.
4. **A face host** turns those controls into a picture. A host is anything that implements the `FaceHost` interface (`host/host.ts`). Today the one host is a VRM host, which drives any VRM avatar through its standard mouth expressions. Tofu, the built-in reference face, is a VRM too.
5. **The renderer** is one shared WebGL context. Every host draws with it, then each playground cell copies its frame onto its own canvas, so many cells never run into the browser's limit on WebGL contexts.

## Where code lives

- `app/src/shared/`: what any page can reuse, with no playground UI. Playback, face hosts, mouth and style code.
- `app/src/playground/`: the page that shows several models at once. Its grid layout, saved profiles and menus live here.
- `tools/`: scripts run by hand or at build time, such as the Tofu generator and the local model scanner.
- Models stay out of the repository, apart from Tofu. The playground lists the `.vrm` files it finds under `app/public/models/` when it starts.

## Design choices that run through the code

- **Motion is computed live, not stored in models.** See [procedural-animation.md](procedural-animation.md).
- **Logic that can be tested has no DOM or Three.js in it.** Layout rules, mouth timing and control mappings live in separate files for that reason, and the parts that need a GPU (shaders, drawing) are checked by running the playground.
- **A host does not know about the page.** The playground can show a new kind of face without changing playback or the follower, and a later OBS page can reuse `app/src/shared/` as it is.
