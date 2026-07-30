# Changelog

## v0.26.7 — Petals Economy & Custom Loadout Fix

### Petals Economy
- Added per-account Petals currency with safe integer migration and a 0-Petal starting balance.
- Added Trading Post Sell and Buy screens.
- Added item locking, safe Sell Junk rules, sale confirmation, and rollback on save failure.
- Added modest successful-extraction Petal rewards.

### Custom Loadout
- Removed ghost Pea Popper and Leaf Vest fallbacks.
- Only packed items may be equipped in Custom Loadout.
- Added weapon, slot, and weight validation before match start.
- Added pending-drop reservation and recovery to avoid early loadout loss.
- Added Return All to Stash and improved centered/short-screen layouts.

### Packaging
- Consolidated canonical index, stylesheet, and game script.
- Added generated START_HERE portable build.
- Added GitHub Pages and release-verification workflows.
