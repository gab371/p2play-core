# Rule: Network Security & Display Identity (P2P)

Host-authoritative rooms over PeerJS mesh. Guests can craft any packet — **never trust client-supplied identity or authoritative state**.

Pin **`p2play-core` ≥ v0.6.6** (`github:gab371/p2play-core#v0.6.6`).

---

## 1. Authoritative messages: host only

Guests must accept `STATE_UPDATE`, `CHAT`, `CHAT_HISTORY_SYNC`, `SYNC_*`, voice moderation, and custom host→client packets **only** from the room host connection.

### Critical: do not compare `conn.peer === hostPeerId` alone

In standalone `PeerManager`, clients store the host link under the **short room code**, while `conn.peer` is the **namespaced** PeerJS id. A naive equality drops **all** host traffic (empty lobby / no sync).

Use the connection **map key** and a **safe** suffix match (never `endsWith("")` — empty string matches every id):

```ts
// Conceptual — implemented as PeerManager.isHostConnection / HubPeerManager.isHostConnection
keyForConnection(conn) === hostPeerId
  || conn.peer === hostPeerId
  || (hostPeerId.length >= 4 && conn.peer.endsWith(hostPeerId))
```

Hub peer ids are not namespaced the same way, but must use the same helper for mesh spoofing.

---

## 2. Actor identity = DataConnection peer

On the host, every `ACTION` / join / reconnect handler must use **`senderPeerId` from `hostActionHandler` / `conn.peer`**, never `payload.playerId` or `msg.sender`.

```ts
onHostAction: (senderPeerId, msg) => {
  if (msg.type !== "ACTION") return;
  const playerId = senderPeerId; // NOT msg.playerId
  // ...
}
```

---

## 3. Display names (chat / voice / board)

| Source | Trust? |
|--------|--------|
| `CHAT.sender` / `sendChat(senderName, …)` | **No** — host rewrites via `resolveChatSender` |
| `JOIN_GAME` `payload.name` when salon identity exists | **No** — pass `trustedName: peerManager.getTrustedUsername?.(playerId)` |
| Re-`JOIN_GAME` / `refreshSeatedIdentity` | **Must not rename** — avatar / disconnected only |
| `REQUEST_RECONNECT` `username` | **Ignored** for seat name (token + remap only) |
| `registerPeerProfile` | **First write wins** (or fill empty only); never overwrite a locked salon name |

Hub: username locked at `PLAYER_JOINED`. Games call `registerPeerProfile` from engine state for chat fallback — must not clobber lobby names.

```ts
handleJoinGameSeat({
  engine: getSeatEngine(),
  playerId,
  payload: { name: payload?.name, avatar: payload?.avatar },
  trustedName: peerManager.getTrustedUsername?.(playerId),
  addPlayer: (id, name, avatar, isHost) => engine.addPlayer(id, name, avatar, isHost),
  addSpectator: (id, name, avatar) => engine.addSpectator(id, name, avatar),
});
```

Bind the local lobby seat id on PeerJS `open` (guests must not stay at `peerId: ""` until `SYNC_LOBBY` — that made UI fall back to `"Joueur"`).

---

## 4. Voice

- Host rewrites `VOICE_STATE_UPDATE.voiceState.peerId` / `username` from the connection + `resolveChatSender`.
- Guests must not apply peer-injected `VOICE_MODERATION_ACTION` (host-only).
- Seed participant labels with `resolveChatSender` when lobby username is missing (avoid permanent `"Joueur"`).

---

## 5. Session / reconnect

- `REGISTER_SESSION` + `sessionToken` required; reject reconnect on `token_mismatch`.
- Remap seat id; do **not** apply client `username` onto the seat.

---

## 6. Turn-bound actions (anti action-queue) — optional / planned

Out-of-turn spam can sit in the PeerJS queue and apply when the turn arrives. Pattern (Uno today; shared helper planned as `p2play-core/turn` — see **Idée 19** in root `TODO.md`):

1. `GameState.turnNonce` bumped on each turn / playable-phase change.
2. Client echoes `turnNonce` on turn-bound actions.
3. Host drops mismatches before the engine switch.

---

## 7. STATE broadcast to late / fuzzy peers

When sending personalized `STATE_UPDATE`, add **both** `player.id` and `conn.peer` to the “already sent” set. Do **not** skip peers with a fuzzy `endsWith` “already known” check that can block the only send path.

---

## 8. E2E expectations

- Per-game `__testHooks__` suites **do not** cover PeerJS identity / sync bugs.
- Hub smokes that only assert the **host** board can stay green while guests see 0 players.
- Prefer asserting on the **guest** after launch: lobby seats visible, deck/theme sync, or board marker — not only host `waitForBoard`.
