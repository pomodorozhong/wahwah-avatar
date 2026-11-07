# Goals

How much character can a puppet get from a few well-timed mouth shapes? `wahwah` generates the voice and the model-independent mouth controls. This repository is where those controls drive 3D characters.

## What this repository owns

- Showing several models at once, each driven by the same rendered utterance, as the playground does.
- Model selection, local model loading, and generic VRM support.
- Visual styles and mouth experiments.
- Later: a Twitch and OBS app, which needs the hash-voice interface on wahwah's roadmap.

wahwah keeps the voice engine, the live microphone analysis, and the `RenderedUtterance` and `FaceControlTrack` types. This repository consumes them through the `wahwah` package, installed from a GitHub release tarball until it is published to npm.

Tofu, the reference VRM, is built in wahwah. This repository carries a copy of its generator, motion and control mapping so the playground can render it; the copy goes away if wahwah later exports them.

## Visual direction

The target is a stylized, front-facing character with readable mouth poses, small head turns and secondary motion, drawn in one of three ways:

- *Breath of the Wild*: painterly surfaces and toon shading.
- *Return of the Obra Dinn*: one-bit monochrome and dithering. [Dithering notes](https://dukope.com/devlogs/obra-dinn/tig-32/)
- *Into the Spider-Verse*: line work, halftones, and poses held over multiple frames. A held pose is worth trying on live speech because it may read more clearly than a mouth that changes shape on every frame. [Imageworks production notes](https://www.imageworks.com/node/1371)

A 2.5D puppet made from warped layers and a full 3D mesh could share the same look. Deform the rig first, then apply the visual style to its colors and masks. Whether the app ships one house style or several switchable styles remains open.
