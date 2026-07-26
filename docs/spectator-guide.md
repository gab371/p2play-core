# 👁️ Spectator Mode Guide (`p2play-core/spectator`)

The spectator module (`p2play-core/spectator`) provides complete Player / Spectator role management for P2Play games, featuring role locking and secret state sanitization.

---

## 🎯 Key Concepts

1. **Roles**:
   - `PLAYER`: Active participant playing the game.
   - `SPECTATOR`: Passive observer viewing the match.
2. **Configuration (`SpectatorConfig`)**:
   - Contains the array of spectator peer IDs and a `lock` boolean (`true` locks role assignment to host only).
3. **State Sanitization (`sanitizeForViewer`)**:
   - Spectators and opponents must not see private information (e.g. hand cards in *Royal Bluff* or *Skull & Roses*, secret roles).
   - `sanitizeForViewer` is called per recipient before rendering or broadcasting state updates.

---

## 🚀 Game Integration

### 1. Import Spectator Module

```ts
import {
  useSpectatorRole,
  isSpectator,
  canChangeRole,
  assignLateJoinerAsSpectator,
} from 'p2play-core/spectator';
```

### 2. Define Sanitization Function (`sanitizeForViewer`)

```ts
import type { GameState } from './types';
import type { SpectatorConfig } from 'p2play-core/spectator';

export function sanitizeGameStateForViewer(
  state: GameState,
  viewerPeerId: string | null,
  spectatorConfig: SpectatorConfig
): GameState {
  if (!state) return state;

  return {
    ...state,
    players: state.players.map((p) => {
      // Scrub hand cards unless viewer is the card owner
      if (p.peerId !== viewerPeerId) {
        return {
          ...p,
          handCards: p.handCards.map(() => ({ hidden: true })),
        };
      }
      return p;
    }),
  };
}
```

### 3. Use `useSpectatorRole` Hook

```tsx
import { usePeer } from 'p2play-core';
import { useSpectatorRole } from 'p2play-core/spectator';
import { sanitizeGameStateForViewer } from './utils';

export function GameApp({ externalPeerManager }: { externalPeerManager?: any }) {
  const { peerManager, isHost, myPeerId, gameState } = usePeer({
    externalPeerManager,
    namespacePrefix: 'mygame',
  });

  const {
    spectatorConfig,
    currentRole,
    isCurrentSpectator,
    assignRole,
    toggleLock,
    sanitizedGameState,
  } = useSpectatorRole({
    peerManager,
    isHost,
    myPeerId,
    gameState,
    sanitizeForViewer: sanitizeGameStateForViewer,
  });

  return (
    <div>
      {isCurrentSpectator ? (
        <div className="badge">Spectator Mode</div>
      ) : (
        <button onClick={() => assignRole(myPeerId!, 'SPECTATOR')}>
          Switch to Spectator
        </button>
      )}

      {/* Render game board with scrubbed state */}
      <GameBoard state={sanitizedGameState} />
    </div>
  );
}
```

---

## 🔒 Handling Late Joiners

If a game is already in progress (`phase === 'PLAYING'`), any late-joining player can be assigned directly as a spectator:

```ts
if (gameEngine.state.phase === 'PLAYING') {
  assignLateJoinerAsSpectator(spectatorConfig, newPeerId);
}
```
