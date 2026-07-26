# 👁️ Guide du Mode Spectateur dans `p2play-core`

Le module spectateur (`p2play-core/spectator`) offre une gestion complète des rôles Joueur / Spectateur dans les jeux P2Play, avec verrouillage des rôles et désinfection des données d'état privées.

---

## 🎯 Concepts Clés

1. **Rôles** :
   - `PLAYER` : Joueur actif participant à la partie.
   - `SPECTATOR` : Observateur passif.
2. **Configuration (`SpectatorConfig`)** :
   - Contient la liste des IDs PeerJS désignés comme spectateurs et un booléen `lock` (si `true`, la modification des rôles est verrouillée par l'hôte).
3. **Désinfection d'État (`sanitizeForViewer`)** :
   - Les spectateurs ne doivent pas voir les informations secrètes des joueurs (ex: cartes en main dans *Royal Bluff* ou *Skull & Roses*, rôles cachés).
   - `sanitizeForViewer` est appelée pour chaque destinataire avant l'affichage ou la transmission.

---

## 🚀 Utilisation dans un Jeu

### 1. Importation du Module Spectateur

```ts
import {
  useSpectatorRole,
  isSpectator,
  canChangeRole,
  assignLateJoinerAsSpectator,
} from 'p2play-core/spectator';
```

### 2. Définition de la Fonction de Sanitization (`sanitizeForViewer`)

```ts
import type { GameState } from './types';
import type { SpectatorConfig } from 'p2play-core/spectator';

export function sanitizeGameStateForViewer(
  state: GameState,
  viewerPeerId: string | null,
  spectatorConfig: SpectatorConfig
): GameState {
  if (!state) return state;

  const viewerIsSpectator = viewerPeerId ? spectatorConfig.spectators.includes(viewerPeerId) : false;

  return {
    ...state,
    players: state.players.map((p) => {
      // Masquer les cartes en main sauf si c'est le joueur lui-même
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

### 3. Intégration du Hook `useSpectatorRole`

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
        <div className="badge">Mode Spectateur</div>
      ) : (
        <button onClick={() => assignRole(myPeerId!, 'SPECTATOR')}>
          Passer Spectateur
        </button>
      )}

      {/* Afficher le jeu avec l'état nettoyé */}
      <GameBoard state={sanitizedGameState} />
    </div>
  );
}
```

---

## 🔒 Gestion des Arrivées en Cours de Partie

Si la partie a déjà démarré (`phase === 'PLAYING'`), tout nouveau joueur rejoignant le salon peut être automatiquement assigné comme spectateur :

```ts
if (gameEngine.state.phase === 'PLAYING') {
  assignLateJoinerAsSpectator(spectatorConfig, newPeerId);
}
```
