# ♻️ Presence & Reconnect Guide (`p2play-core/presence`)

The presence module orchestrates **disconnect grace**, **REQUEST_RECONNECT**, and **JOIN_GAME seat** policy so each game does not copy the same ~50 lines of timers / protocol. Game engines keep **business remap** (bags, pending actions, shooter id, …) behind `remapPlayerId`.

Requires **`p2play-core` ≥ v0.5.0** (current ecosystem pin: **v0.6.0**).

---

## 🎯 Key Concepts

| Layer | Responsibility |
|-------|----------------|
| Heartbeat (`PeerManager`) | Detect dead DataChannels (PING/PONG) → `onPeerStatusChange('DISCONNECTED')` |
| Session (`p2play-core/session`) | Persist `previousPeerId` + profile in `localStorage` for F5 / tab reopen |
| Presence (`p2play-core/presence`) | Grace 60s, ACCEPTED/REJECTED, JOIN seat refresh vs spectator |
| Engine | `markDisconnected` / `remapPlayerId` / `removePlayer` (maps métier) |

**Policy**

- **Lobby** (and optional extra phases, e.g. billard `CONFIG`) or **spectator** → remove immediately on disconnect.
- **In-game seated player** → `markDisconnected` + grace timer (default **60s**); expire → `removePlayer`.
- Guest reconnect → `REQUEST_RECONNECT` with previous peer id → host `remapPlayerId` → `RECONNECT_ACCEPTED` or `RECONNECT_REJECTED`.

> Hub salon auto-rejoin is **out of scope** for this module today; standalone `usePeer` already saves session and sends `REQUEST_RECONNECT` when rejoining a room.

---

## 🚀 Game Integration

### 1. Engine contract

```ts
// Required on the game engine
markDisconnected(id: string): void;
isDisconnected(id: string): boolean;
remapPlayerId(oldId: string, newId: string, profile?: { username?: string; avatar?: string }): boolean;
removePlayer(id: string): void;
```

Use `remapRecordKey` for flat keyed maps:

```ts
import { remapRecordKey } from "p2play-core/presence";

remapRecordKey(this.state.bags, oldId, newId);
remapRecordKey(this.state.spectatorLocks, oldId, newId);
```

### 2. Wire host `useGame` with `attachPresenceHandlers`

```ts
import {
  attachPresenceHandlers,
  createSeatEngine,
  handleJoinGameSeat,
} from "p2play-core/presence";

const getSeatEngine = () =>
  createSeatEngine({
    getPhase: () => engine.state.phase,
    lobbyPhases: ["LOBBY"], // billard: ["LOBBY", "CONFIG"]
    getPlayers: () => engine.state.players,
    getSpectators: () => engine.state.spectators, // omit if none
    markDisconnected: (id) => engine.markDisconnected(id),
    isDisconnected: (id) => engine.isDisconnected(id),
    remapPlayerId: (o, n, p) => engine.remapPlayerId(o, n, p),
    removePlayer: (id) => engine.removePlayer(id),
  });

const presence = attachPresenceHandlers({
  peerManager,
  getEngine: getSeatEngine,
  graceMs: 60_000,
  onBroadcast: () => broadcastSanitizedStates(engine.state),
  onSeatRemapped: (oldId, newId) => {
    // optional: voice / chat identity refresh
  },
  onHostAction: (_sender, msg) => {
    if (msg.type !== "ACTION") return;
    const { actionName, playerId, payload } = msg;
    switch (actionName) {
      case "JOIN_GAME":
        handleJoinGameSeat({
          engine: getSeatEngine(),
          playerId,
          payload: { name: payload?.name, avatar: payload?.avatar },
          isHostPlayer: playerId === myPeerId,
          addPlayer: (id, name, avatar, isHost) =>
            engine.addPlayer(id, name, avatar, isHost),
          addSpectator: (id, name, avatar) =>
            engine.addSpectator(id, name, avatar), // omit → always addPlayer
        });
        break;
      // … other game actions
    }
    broadcastSanitizedStates(engine.state);
  },
});

return () => presence.dispose();
```

**Do not** locally manage `graceTimers`, intercept `REQUEST_RECONNECT`, or overwrite `onPeerStatusChange` without chaining — `attachPresenceHandlers` chains the previous handler (voice / `usePeer`).

### 3. Client session (usually already in `usePeer`)

```ts
import { loadSession } from "p2play-core/session";

// Prefill lobby from last session for this room code
const session = loadSession(roomCode);
```

`usePeer.joinGame(roomId, profile?)` persists the session and, when a previous session exists for that room, sends `REQUEST_RECONNECT` before / around join.

Pass a real **profile** (`username` / `avatar`) into `hostGame` / `joinGame` so the saved session is not `"Joueur"`.

---

## 📡 Protocol (host ↔ guest)

| Message | Direction | Notes |
|---------|-----------|--------|
| `REQUEST_RECONNECT` | guest → host | Fields flat on message: `previousPeerId`, `username`, `sessionToken`, … |
| `RECONNECT_ACCEPTED` | host → guest | `{ type, payload: { peerId, previousPeerId } }` |
| `RECONNECT_REJECTED` | host → guest | `{ type, payload: { reason } }` — e.g. `grace_expired` |

After remap, a subsequent `JOIN_GAME` for the **new** peer id must **refresh identity only** (not treat as late spectator) — that is what `handleJoinGameSeat` does when the player is already seated.

---

## ✅ New-game checklist

1. Engine: mark / isDisconnected / remap / remove (+ `remapRecordKey` for maps).
2. Host `useGame`: `createSeatEngine` + `attachPresenceHandlers` + `presence.dispose()`.
3. `JOIN_GAME` → `handleJoinGameSeat`.
4. Depend on `github:gab371/p2play-core#v0.6.0` (or newer).
5. Smoke: F5 guest mid-game → disconnected badge → reconnect ≤ 60s → actions OK; lobby disconnect → immediate remove.

---

## 📚 Related

- [API Reference — Presence](./api-reference.md#️-presence-module-p2play-corepresence)
- [API Reference — Session](./api-reference.md#-session-module-p2play-coresession)
- [Spectator Guide](./spectator-guide.md) — role / sanitize (orthogonal to presence grace)
