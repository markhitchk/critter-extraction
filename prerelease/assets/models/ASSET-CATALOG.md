# 3D Asset Blockout Catalog

The current GLB files are **procedural blockouts**, not finished high-end 3D models.

## Current reality

- 32 asset records exist in the manifest.
- 0 assets meet the production-ready standard.
- Character and enemy files are static and unrigged.
- Most generated models are assembled from box and diamond primitives.
- Only a small Pine Valley subset and two weapons are connected to the prerelease renderer.
- The remaining GLBs can be opened as files, but they do not automatically appear in gameplay.

## Production-ready acceptance requirements

A model must have a non-primitive sculpted silhouette, clean topology, UVs, finished PBR materials, correct scale and pivots, runtime integration, and validated LODs. Characters additionally need a skeleton, skin weights, animation clips, and weapon/backpack attachment sockets.

The previous `ready` and `authored-model-coverage-complete` wording was inaccurate and has been removed.
