# 🎮 `p2play-core`

**Toolkit P2P Standalone-First et moteur réseau unifié pour les jeux [P2Play](https://github.com/gab371).**

`p2play-core` est la bibliothèque fondamentale partagée par l'ensemble des jeux de l'écosystème P2Play (*Billard P2Play*, *Royal Bluff*, *Skull & Roses*, *Sheriff & Smugglers*). Elle prend en charge l'intégralité du transport WebRTC sans serveur (via PeerJS), la gestion des salons, la synchronisation d'état de jeu, le chat textuel, les effets sonores P2P, le mode Spectateur et le Chat Vocal WebRTC spatialisé.

---

## ✨ Fonctionnalités Principales

- 🚀 **Architecture Standalone-First** : Fonctionne de manière 100% autonome dans un jeu Vite/React (création & jonction de salon) **OU** en mode embarqué au sein du **P2Play Hub** sans rupture WebRTC.
- 🌐 **Réseau P2P WebRTC (PeerJS)** : Connexion directe maillée/étoile entre joueurs sans serveur de jeu centralisé.
- ⚛️ **Hook React `usePeer`** : Abstraction clé en main gérant la reconnexion, l'état de la partie, les actions des joueurs, le chat textuel et la lecture des effets sonores (SFX).
- 👁️ **Module Spectateur (`p2play-core/spectator`)** : Séparation dynamique des rôles Joueurs / Spectateurs, verrouillage des rôles par l'hôte et masquage/désinfection des cartes et informations privées (`sanitizeForViewer`).
- 🎙️ **Module Chat Vocal P2P (`p2play-core/voice`)** : Maillage audio WebRTC sans serveur, audio spatialisé 2D/3D (Web Audio API), gestion du volume par pair, modération (mute/deafen) et composants UI (`VoiceChatPanel`, `VoiceBubble`).
- 🔗 **Partage de Salon via URL** : Prise en charge automatique des codes de salon et liens d'invitation partageables (`?room=ABCDE`).

---

## 📦 Installation

Dans votre jeu React/Vite :

```bash
# Via GitHub release / tag
npm install github:gab371/p2play-core#v0.2.0

# Ou avec pnpm
pnpm add github:gab371/p2play-core#v0.2.0
```

---

## 🚀 Démarrage Rapide

### 1. Jeu Autonome (*Standalone Mode*)

Pour un jeu exécuté directement sans le Hub :

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
    namespacePrefix: 'mygame', // Préfixe d'isolation pour éviter les collisions de salons PeerJS
    sounds: {
      click: () => soundManager.playClick(),
      victory: () => soundManager.playVictory(),
    },
  });

  if (status === 'IDLE') {
    return (
      <div>
        <button onClick={() => hostGame()}>Créer une partie</button>
        <button onClick={() => joinGame('ABCDE')}>Rejoindre le salon ABCDE</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Salon : {hostPeerId}</h2>
      <button onClick={() => sendAction('PLAY_CARD', { cardId: 42 })}>Jouer une carte</button>
    </div>
  );
}
```

---

### 2. Jeu Embarqué dans le Hub (*Hub Embedded Mode*)

Lorsque le jeu est monté dynamiquement par le **Hub P2Play**, le Hub transmet son instance réseau active via l'option `externalPeerManager` :

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
    namespacePrefix: 'mygame', // Fallback si exécuté hors du Hub
  });

  // Le jeu s'exécute directement sur l'instance P2P du Hub sans rechargement de page
  return <GameBoard state={gameState} onAction={sendAction} />;
}
```

---

## 👁️ Module Spectateur (`p2play-core/spectator`)

Le module spectateur permet d'accueillir des observateurs sans impacter les règles de jeu et en masquant les informations confidentielles (ex: cartes cachées en main).

```tsx
import { usePeer } from 'p2play-core';
import { useSpectatorRole } from 'p2play-core/spectator';

function sanitizeForViewer(state: GameState, viewerPeerId: string | null, spectatorConfig: SpectatorConfig) {
  if (!state) return state;
  // Masquer les cartes privées des adversaires et des spectateurs
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

📘 **Consultez le [Guide complet du Mode Spectateur](docs/spectator-guide.md)**.

---

## 🎙️ Module Chat Vocal WebRTC (`p2play-core/voice`)

Intégrez un chat vocal P2P sans serveur avec panneau de contrôle et bulles vocales sur les avatars :

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

📘 **Consultez le [Guide complet du Chat Vocal](docs/voice-chat-guide.md)**.

---

## 📚 Documentation Détaillée

- 📖 **[Référence complète de l'API](docs/api-reference.md)** : Description exhaustive des méthodes, hooks et types.
- 👁️ **[Guide du Mode Spectateur](docs/spectator-guide.md)** : Intégration du rôle spectateur et sanitization d'état.
- 🎙️ **[Guide du Chat Vocal WebRTC](docs/voice-chat-guide.md)** : Architecture du maillage vocal P2P et audio spatialisé.

---

## ⚙️ Dépendances de Pair (Peer Dependencies)

- `peerjs`: `^1.5.0`
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`

---

## 🔄 Versioning & Release Workflow

1. Modifiez le code dans `src/`
2. Exécutez `npm run build` (génère les bundles ESM dans `dist/` avec `tsup`)
3. Créez un commit et publiez un tag Git : `git tag vX.Y.Z && git push origin vX.Y.Z`
4. Mettez à jour la dépendance `p2play-core` dans vos jeux et dans le Hub :
   ```json
   "dependencies": {
     "p2play-core": "github:gab371/p2play-core#vX.Y.Z"
   }
   ```
