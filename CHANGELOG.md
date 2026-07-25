# Changelog

## 0.1.1

- Use named `import { Peer } from "peerjs"` for cleaner ESM interop.
- `sendToHost` retries briefly when the host data channel is not open yet (avoids silent drop right after join).
- Host may only force **spectator** role on others (never force player mode).

## 0.1.0

- Initial release: `PeerManager` (namespaced PeerJS transport), `PeerManagerLike`, generic envelopes (`CHAT` / `AUDIO_EVENT` / `STATE_UPDATE`), `usePeer` hook.
- Optional `p2play-core/spectator` module (roles, locks, late-join helpers, messages).
- Standalone-first: games work without the Hub; Hub injects `externalPeerManager`.
