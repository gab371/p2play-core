# Changelog

## 0.1.0

- Initial release: `PeerManager` (namespaced PeerJS transport), `PeerManagerLike`, generic envelopes (`CHAT` / `AUDIO_EVENT` / `STATE_UPDATE`), `usePeer` hook.
- Optional `p2play-core/spectator` module (roles, locks, late-join helpers, messages).
- Standalone-first: games work without the Hub; Hub injects `externalPeerManager`.
