# Procedural animation

The mouths in this repository are computed while the page runs. They are not recorded clips stored in a model file. This page says why.

## What it means here

A glTF or VRM file can carry animation clips, such as a wave or a walk cycle. The `VRM1_Constraint_Twist_Sample.vrm` sample has none. It holds the face mesh, its mouth blendshapes (the shapes the mouth can bend into), the VRM data, and spring bone settings for hair and clothes.

Nothing in the file says when to move. The code decides that, every frame, from the speech:

1. wahwah renders an utterance and supplies its timing as a `FaceControlTrack`.
2. The playground follows that track (`follower.ts`).
3. A mouth mode in `puppetMouth.ts` turns the controls and syllable rhythm into a pose for this frame. For example, replacement mouths hold one of five cut-paper drawings for a twelfth of a second, and Gesture replay stretches traced frames to fit each syllable.

Animation made this way, by code at runtime from rules and inputs, is called procedural animation. The spring bones are a second case: the file stores their settings, and a physics step moves them live.

## Why not store it in the model

- **Speech is not known ahead of time.** A recorded clip plays the same way for "hello" and for a long sentence. Each utterance here has its own timing, so the mouth has to follow it.
- **The motion has to stretch.** Gesture replay fits traced frames to each syllable, and the other modes switch shapes on the syllable rhythm. A fixed clip cannot do either.
- **Models stay unmodified.** The sample is a third-party VRoid model that is not committed (see `.gitignore`). The code works on any model whose face matches, with no edits to the file, and never changes the `.vrm` on disk.
- **wahwah owns the timing.** This repository consumes it through the `wahwah` package (see `goals.md`).

## What a model must provide

The mouth modes only apply to a model whose face matches the sample, because the drawings and shader patches are cut for its face coordinates. `sampleFaceMaterials` in `puppetMouth.ts` checks for:

- materials named `Face_00_SKIN…` and `FaceMouth_00_FACE…`,
- a morph target named `Face_Blendshape.Fcl_MTH_A`,
- face mesh bounds that match the sample (VRoid names materials alike on every model).

A model that does not match, such as Tofu, gets no Mouth menu. Without the sample `.vrm` on disk, the new code has nothing to change.

## Where things live

- Timing and control mappings with no Three.js types, so they are unit tested: `app/src/shared/host/mouthPlan.ts`.
- The traced frames used by Gesture replay: `mouthPlan.ts` (drawn by `referenceMouth.ts`).
- The shader patches and cut-paper drawings: `app/src/shared/host/puppetMouth.ts`. These have no automated test; they are checked by running the playground.

## How common this is

Splitting authored clips from live, code-driven movement is a general practice, not something specific to this project. Clips suit motion that plays the same every time, such as a cutscene. Live movement suits anything that depends on input you cannot know ahead of time, and lip sync is the usual example. This is a summary from general knowledge; the page cites no sources.
