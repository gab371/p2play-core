# 🎮 `p2play-core`

**Standalone-first P2P toolkit and unified networking engine for [P2Play](https://github.com/gab371) games.**

`p2play-core` is the foundational shared library powering all games in the P2Play ecosystem (*Billard P2Play*, *Royal Bluff*, *Skull & Roses*, *Sheriff & Smugglers*). It handles serverless WebRTC transport (via PeerJS), room management, game state synchronization, text chat, P2P sound effects (SFX), Spectator mode, spatialized WebRTC Voice Chat, **session persistence**, and **presence / reconnect grace**.

---

## ✨ Key Features

- 🚀 **Standalone-First Architecture**: Works 100% autonomously in any Vite/React game (hosting & joining rooms) **OR** in embedded mode inside **P2Play Hub** with zero WebRTC disconnection.
- 🏠 **Shared Home Lobby (`P2PlayLobby`)**: Themed create/join UI with URL invitation deep-links, optional voice toggle, and Tailwind `classes` overrides per game.
- 🌐 **WebRTC P2P Network (PeerJS)**: Serverless mesh/star direct peer connections without a central game server.
- ⚛️ **`usePeer` React Hook**: Game state sync, actions, chat, SFX, profile-aware `hostGame` / `joinGame`, and automatic `REQUEST_RECONNECT` when a local session exists for the room.
- 👁️ **Spectator Module (`p2play-core/spectator`)**: Dynamic Player / Spectator role assignment, host role locking, and secret state scrubbing (`sanitizeForViewer`).
- 🎨 **UI primitives (`p2play-core/ui`)**: Shared shadcn-style components (`Button`, `Badge`, `Dialog`, …) and `SoundToggle` for Hub + games (apps provide CSS variables + Tailwind content scan).
- 🎙️ **P2P Voice Chat Module (`p2play-core/voice`)**: Serverless WebRTC audio mesh, 2D/3D spatial audio (Web Audio API), per-peer volume controls, moderation tools (mute/deafen), and UI components (`VoiceChatPanel`, `VoiceBubble`).
- 💬 **Text Chat & Journal (`p2play-core/chat`)**: Shared `TextChatPanel` / `JournalPanel` UI, `useTextChat` hook, Hub-scoped chat history that survives game swaps (`CHAT_HISTORY_SYNC` for late joiners). Host rewrites `CHAT.sender` from salon identity (`resolveChatSender` / `getTrustedUsername`).
- 🔒 **Host-authoritative sync**: Guests accept `STATE_UPDATE` / chat / voice only from the host connection (map-key aware; fixed in **v0.6.6**). Locked display names on `JOIN_GAME` / reconnect.
- 💾 **Session (`p2play-core/session`)**: `localStorage` helpers (`saveSession` / `loadSession`) for reconnect identity after F5; `sessionToken` verified on reconnect.
- ♻️ **Presence & Reconnect (`p2play-core/presence`)**: Shared grace timers, `REQUEST_RECONNECT` protocol, and JOIN_GAME seat policy — games only implement `remapPlayerId` business maps.
- ❤️ **Heartbeat**: Host/client PING/PONG on PeerManager (and Hub peer manager) to surface silent disconnects.
- 🔗 **URL Room Sharing**: Shareable room codes / invitation URLs (`?room=` / hash routes) plus UI helpers `CopyRoomLinkButton` and `RoomCodeBadge` (icon-only copy next to the code).

---

## 📦 Installation

In your React/Vite game project:

```bash
# Via GitHub release tag
npm install github:gab371/p2play-core#v0.6.6

# Or with pnpm
pnpm add github:gab371/p2play-core#v0.6.6
```

---

## 🚀 Quick Start

### 1. Standalone Game Mode

For a game running directly without the Hub:

```tsx
import { usePeer } from 'p2play-core';

export function StandaloneGame() {
  const {
    myPeerId,
    hostPeerId,
    isHost,
    status,
    gameState,
    hostGame,
    joinGame,
    sendAction,
    sendChat,
    playSfx,
  } = usePeer({
    namespacePrefix: 'mygame', // Isolation prefix preventing room collisions on PeerJS broker
    sounds: {
      click: () => soundManager.playClick(),
      victory: () => soundManager.playVictory(),
    },
  });

  if (status === 'IDLE') {
    return (
      <div>
        <button onClick={() => hostGame()}>Create Game</button>
        <button onClick={() => joinGame('ABCDE')}>Join Room ABCDE</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Room: {hostPeerId}</h2>
      <button onClick={() => sendAction('PLAY_CARD', { cardId: 42 })}>Play Card</button>
    </div>
  );
}
```

---

## 🏠 Shared Home Lobby (`P2PlayLobby`)

Use the shared component for the standalone create/join screen instead of reimplementing forms:

```tsx
import { P2PlayLobby } from 'p2play-core';

<P2PlayLobby
  title="MY GAME"
  theme="amber"
  status={status}
  error={error}
  showVoiceToggle={false}
  compactHostSection
  joinLayout="side-by-side"
  onHost={(name, avatar) => hostRoom(name, avatar)}
  onJoin={(name, avatar, code) => joinRoom(name, avatar, code)}
/>
```

📘 Full guide: **[Shared Lobby Guide](docs/lobby-guide.md)**

---

### 2. Hub Embedded Mode

When mounted dynamically by **P2Play Hub**, the Hub injects its active network instance via `externalPeerManager`:

```tsx
import { usePeer } from 'p2play-core';
import type { PeerManagerLike } from 'p2play-core';

interface AppProps {
  isEmbedded?: boolean;
  externalPeerManager?: PeerManagerLike<MyGameState>;
}

export function App({ isEmbedded, externalPeerManager }: AppProps) {
  const { isHost, gameState, sendAction } = usePeer({
    externalPeerManager,
    namespacePrefix: 'mygame', // Fallback when running outside Hub
  });

  // Reuses Hub's P2P WebRTC session seamlessly without page reload
  return <GameBoard state={gameState} onAction={sendAction} />;
}
```

---

## 👁️ Spectator Module (`p2play-core/spectator`)

Safely host observers without impacting game rules by scrubbing secret information (e.g. hidden hand cards):

```tsx
import { usePeer } from 'p2play-core';
import { useSpectatorRole } from 'p2play-core/spectator';

function sanitizeForViewer(state: GameState, viewerPeerId: string | null, spectatorConfig: SpectatorConfig) {
  if (!state) return state;
  // Scrub opponents' and spectators' private hand cards
  return {
    ...state,
    players: state.players.map(p => p.peerId === viewerPeerId ? p : { ...p, hand: [] })
  };
}

export function GameWithSpectators({ externalPeerManager }: { externalPeerManager?: any }) {
  const { peerManager, isHost, myPeerId, gameState } = usePeer({ externalPeerManager, namespacePrefix: 'mygame' });

  const {
    isCurrentSpectator,
    assignRole,
    sanitizedGameState,
  } = useSpectatorRole({
    peerManager,
    isHost,
    myPeerId,
    gameState,
    sanitizeForViewer,
  });

  return (
    <GameBoard state={sanitizedGameState} isSpectator={isCurrentSpectator} />
  );
}
```

📘 Read the **[Spectator Mode Guide](docs/spectator-guide.md)** for full documentation.

---

## 🎙️ WebRTC Voice Chat Module (`p2play-core/voice`)

Integrate serverless P2P voice chat with volume controls, spatial audio, and avatar voice bubbles:

```tsx
import { usePeer } from 'p2play-core';
import { useVoiceChat, VoiceChatPanel, VoiceBubble } from 'p2play-core/voice';

export function GameWithVoice() {
  const { peerManager, myPeerId, connectedPeers, isHost } = usePeer({ namespacePrefix: 'mygame' });

  const voice = useVoiceChat({
    peer: peerManager.getPeer(),
    myPeerId,
    connectedPeers,
  });

  return (
    <div>
      <VoiceChatPanel voice={voice} isHost={isHost} compact={true} />
      <VoiceBubble peerId={myPeerId!} voiceState={voice.states.find(s => s.peerId === myPeerId)} />
    </div>
  );
}
```

📘 Read the **[Voice Chat Guide](docs/voice-chat-guide.md)** for full documentation.

---

## ♻️ Presence & Reconnect (`p2play-core/presence`)

Host-side grace + reconnect protocol (do not copy timers per game):

```ts
import {
  attachPresenceHandlers,
  createSeatEngine,
  handleJoinGameSeat,
} from "p2play-core/presence";

const presence = attachPresenceHandlers({
  peerManager,
  getEngine: () =>
    createSeatEngine({
      getPhase: () => engine.state.phase,
      getPlayers: () => engine.state.players,
      getSpectators: () => engine.state.spectators,
      markDisconnected: (id) => engine.markDisconnected(id),
      isDisconnected: (id) => engine.isDisconnected(id),
      remapPlayerId: (o, n, p) => engine.remapPlayerId(o, n, p),
      removePlayer: (id) => engine.removePlayer(id),
    }),
  onBroadcast: () => broadcastSanitizedStates(engine.state),
  onHostAction: (_sender, msg) => {
    /* game ACTION switch — JOIN_GAME via handleJoinGameSeat */
  },
});

return () => presence.dispose();
```

📘 Read the **[Presence & Reconnect Guide](docs/presence-guide.md)** for engine contract, protocol, and checklist.

---

## 📚 Documentation Links

- 📘 **[API Reference](docs/api-reference.md)**: Complete reference (`usePeer`, lobby, Hub manifest, spectator, voice, session, presence).
- 🏠 **[Shared Lobby Guide](docs/lobby-guide.md)**: `P2PlayLobby` themes, classes, and URL invitations.
- 👁️ **[Spectator Mode Guide](docs/spectator-guide.md)**: Role management and state sanitization.
- 🎙️ **[Voice Chat Guide](docs/voice-chat-guide.md)**: WebRTC P2P mesh topology and spatial audio.
- ♻️ **[Presence & Reconnect Guide](docs/presence-guide.md)**: Grace timers, `REQUEST_RECONNECT`, JOIN seat policy.

## ⚙️ Peer Dependencies

- `peerjs`: `^1.5.0`
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`

---

## 🔄 Versioning & Release Workflow

1. Update code in `src/`
2. Run `npm run build` (generates ESM bundles in `dist/` using `tsup`)
3. Tag and push Git release: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. Update `p2play-core` dependency in games and Hub:
   ```json
   "dependencies": {
     "p2play-core": "github:gab371/p2play-core#vX.Y.Z"
   }
   ```
