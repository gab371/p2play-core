# p2play-core

Standalone-first P2P toolkit for [P2Play](https://github.com/gab371) games.

Works **without the Hub**: create a room with `PeerManager` + `usePeer` in any Vite/React game. The Hub optionally injects `externalPeerManager` for embedded play.

## Install

```bash
pnpm add p2play-core@github:gab371/p2play-core#v0.1.1
# or
npm install github:gab371/p2play-core#v0.1.1
```

## Quick start (standalone)

```ts
import { PeerManager, usePeer } from 'p2play-core';

const peer = usePeer({
  namespacePrefix: 'royal',
  sounds: { ping: () => soundManager.playPing() },
});

await peer.hostGame(); // or peer.joinGame(roomCode)
```

## Optional spectator mode

```ts
import {
  canChangeRole,
  assignLateJoinerAsSpectator,
  isSpectator,
} from 'p2play-core/spectator';
```

Games that do not need spectators simply never import this path.

## Peer dependencies

`peerjs`, `react`, `react-dom` (v19).

## Versioning

1. Change code → `npm run build` → tag `vX.Y.Z`
2. Bump the dep in each game → rebuild standalone + lib → GitHub Release (`dist.zip`)
3. Bump `hub-p2play/games.json` if the Hub should pull the new game builds

Heartbeat / session reconnect (Idée 7 steps 6–7) will land in a later minor of this package.
