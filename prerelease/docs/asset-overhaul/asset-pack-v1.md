# Critter Extraction Runtime Asset Pack V1

This is the first **actual binary 3D asset commit** for the high-end asset overhaul. These files are browser-ready GLB/WebP assets, not prompts, mockups, or SVG placeholders.

![Asset Pack V1 preview](./asset-pack-v1-preview.webp)

## Included runtime assets

| Asset | Runtime file | Format | Current state |
|---|---|---|---|
| Pea Popper | `assets/models/weapons/pea_popper/pea_popper_lod0.glb` | GLB 2.0 | Authored asset; renderer integration pending |
| Small supply crate | `assets/models/loot/supply_crate/supply_crate.glb` | GLB 2.0 | Authored asset; open animation pending |
| Pine Valley pine tree | `assets/models/vegetation/pine_tree/pine_tree_lod0.glb` | GLB 2.0 | Authored LOD0 asset; LOD1/LOD2 pending |
| Pine Valley dirt | `assets/textures/terrain/pine_valley/dirt_basecolor.webp` | WebP | Authored base-color texture; normal/roughness/AO pending |

## Honest status

These assets now exist in the repository, but the current game renderer still draws procedural meshes and does not yet render these GLB files during gameplay. The next implementation step is to connect the GLB loader and asset registry to the existing WebGL renderer, then replace the procedural Pea Popper, supply crate, pine tree, and ground material in the Pine Valley vertical slice.

The tactical puppy character is not included in V1. It requires a properly sculpted, rigged, and animated character asset and must not be replaced by the rejected ragdoll-style prototype.
