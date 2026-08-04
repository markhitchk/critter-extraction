# Critter Codes visible UI fix

This follow-up ensures the Critter Codes interface is visible in the main game lobby before the packed reward runtime finishes loading.

## Visible entry points

- a **Critter Codes** button in the top action bar
- a dedicated **Account Rewards / Critter Codes** dashboard panel in the main lobby
- a responsive fallback redemption dialog with loading, ready, and error states

The entry shell loads first and remains visible if a payload fragment, decompression step, or runtime initialization fails. Once the full reward runtime is ready, both entry points open the complete Rewards Terminal.

## Validation

The production Node test now requires the top-bar entry, dashboard panel, fallback modal, responsive styling, reduced-motion support, runtime-first ordering, and player-visible error state.
