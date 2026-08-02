# Runtime 3D Models

This directory is reserved for browser-ready authored models used by Critter Extraction.

The primary art target is `assets/loading/gameplay-reference.webp`.

## Required Structure

```text
assets/models/
  characters/
  enemies/
  weapons/
  armor/
  backpacks/
  items/
  loot/
  vegetation/
  terrain/
  rocks/
  structures/
  railway/
  props/
```

Texture sets belong under `assets/textures/` and animation-only libraries belong under `assets/animations/` when they are not embedded in a character GLB.

## Runtime Rules

- Prefer binary glTF (`.glb`).
- Use Y-up coordinates and meter units.
- Keep repository-relative paths.
- Do not load Blender, Maya, ZBrush, Substance, or other editable source files in the browser.
- Do not place AI-generated reference images on planes and call them models.
- Do not commit ripped or unlicensed game assets.
- Correct normals, winding, holes, backface issues, and non-finite vertices before export.
- Use smooth shading and intentional hard edges.
- Apply or declare transforms before integration.
- Use shared materials and texture atlases where practical.
- Provide LODs for characters, enemies, large vegetation, large rocks, structures, and railway vehicles.
- Provide simplified collision proxies for assets that affect movement, cover, projectiles, or interaction.

## Naming

Use lowercase snake case for files and stable manifest IDs.

Example:

```text
assets/models/characters/tactical_puppy_lod0.glb
assets/models/characters/tactical_puppy_lod1.glb
assets/models/characters/tactical_puppy_lod2.glb
assets/models/weapons/pea_popper.glb
assets/models/vegetation/pine_a_lod0.glb
```

Do not encode temporary version numbers such as `final2`, `new`, or `fixed_again` into runtime names.

## Character Contract

Player and enemy characters must expose stable attachment nodes where applicable:

- `hand_r_grip`
- `hand_l_support`
- `backpack_socket`
- `weapon_back_socket`
- `headgear_socket`
- `nameplate_socket`

Character feet must contact the ground at the model origin. Keep animation names stable across species whenever rigs are compatible.

## Weapon Contract

Weapons must expose:

- `grip_r`
- `grip_l`
- `muzzle`
- `sight`
- `magazine`

The muzzle node must match the projectile/tracer origin. First-person presentation may use a dedicated optimized model, but it must represent the same equipped weapon.

## Asset Status

Every planned or active asset must be represented in `assets/manifest/high-end-assets.json`.

An asset must not be marked `ready` until its runtime model, required textures, LODs, collision data, and attachment metadata pass validation and have been tested in the playable game.
