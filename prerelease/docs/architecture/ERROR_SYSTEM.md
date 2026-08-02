# Error System

The canonical startup and error-reporting implementation lives in `core/error-system/`. Root `404.html` and `error.html` are compatibility adapters only. Reports use stable category codes plus a unique event ID and exclude account, inventory, multiplayer signaling, network-address, clipboard, and browser-storage contents.
