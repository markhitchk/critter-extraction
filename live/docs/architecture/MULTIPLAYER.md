<div align="center">
  <img src="../../assets/branding/icon.svg" alt="Critter Extraction logo" width="95">

  # MULTIPLAYER ARCHITECTURE

  **Peer rooms · host authority · Fair Play validation**
</div>

## Connection model

Critter Extraction multiplayer uses PeerJS/WebRTC for direct browser connections. One player hosts the authoritative room and guests connect using a six-digit room code plus the required connection invitation data.

The current LIVE design supports up to eight players across Co-op and VS Arena modes.

## Authority model

The host owns the trusted match state for:

- player admission and room capacity
- movement and combat validation
- damage, healing, ammunition, loot, and gear ownership
- enemy and objective state
- respawns, scoring, match rules, and match completion
- Fair Play removals and host-local restrictions

Guests send input and actions. The host validates them, updates the match, and distributes authoritative snapshots.

## Room flow

1. The host creates a room and receives a six-digit code.
2. The host shares the combined invitation information.
3. A guest enters the code and completes the direct connection exchange.
4. The waiting room displays connected players and selected loadouts.
5. The host starts the match when room rules and players are ready.

Room codes must not silently bypass the intended join confirmation flow.

## Reliability requirements

- Preserve queued semi-automatic shots until the host can process them.
- Smooth small guest corrections while retaining hard correction for major desync.
- Keep player state visible and synchronized after joins, deaths, respawns, and disconnects.
- Handle a host exit or network failure with a clear player-facing result.
- Keep Co-op and VS-specific rules isolated.

## Privacy boundary

Never include WebRTC descriptions, signaling payloads, room invitations, room codes, IP addresses, access tokens, or private profile contents in public reports.

The game is peer-to-peer and cannot provide dedicated-server authority. Host validation reduces cheating and desync but does not make a modified host trustworthy.

## Compatibility checklist

- [ ] Existing six-digit room flows still work.
- [ ] Host and guest profiles appear correctly in the lobby.
- [ ] Co-op players can see and interact with each other.
- [ ] Guest input, firing, inventory, and extraction synchronize.
- [ ] VS deaths, respawns, scoring, and results synchronize.
- [ ] Disconnect and room-full states produce clear messages.
- [ ] No private connection data enters diagnostics.

## Related documents

- **[Security and Ban System](../../security/README.md)**
- **[Game Architecture](GAME_ARCHITECTURE.md)**
- **[Error System](ERROR_SYSTEM.md)**

---

<div align="center"><strong>Harley’s Studios · Direct Multiplayer</strong></div>
