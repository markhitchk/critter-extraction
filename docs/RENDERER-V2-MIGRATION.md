# Critter Extraction Renderer V2 Migration

Branch: `agent-critter-renderer-v2`

## Goal
Upgrade the browser renderer in stages while preserving the existing game systems and keeping the current renderer available as a fallback.

## Stages
1. Renderer foundation: capability detection, adaptive quality policy, renderer bridge.
2. Babylon sandbox: WebGPU preference with WebGL fallback, scene/camera/light lifecycle.
3. World rendering: terrain, props, cover, vegetation, LOD and instancing.
4. Critters and weapons: GLB models, animation, first/third person rendering.
5. Effects and mobile optimization: particles, shadows, post-processing, dynamic resolution.
6. Integration and cutover: connect existing game state, test solo/co-op/PvP/touch, keep emergency legacy fallback.

## Stage 1 rule
Stage 1 must not replace the current live renderer merely by being present. New renderer code stays opt-in until later stages are validated.
