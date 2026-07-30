# Save schema v17

The stable local-storage key remains `critterExtractionInventory`.

Each account includes `petals` as a non-negative integer, `economyTransactions` as a capped audit list, and `pendingDrop` for interrupted Custom Loadout startup recovery. Existing stash and prepared arrays retain item IDs, quantities, and lock/favorite metadata. Migration is idempotent and does not rename the save key.

When a prior build lacks Petals, migration assigns `0`. A reserved pending drop is restored only when the prepared loadout is empty, then the recovery marker is cleared.
