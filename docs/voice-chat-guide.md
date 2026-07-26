# 🎙️ Guide du Chat Vocal WebRTC P2P (`p2play-core/voice`)

`p2play-core` intègre une solution de chat vocal P2P sans serveur central, fonctionnant via un maillage dynamique de connexions audio WebRTC entre les pairs.

---

## 🏗️ Architecture Reseau Vocal

- **Zero-Server Audio Mesh** : Chaque joueur transmet son flux microphone aux autres pairs via l'instance PeerJS sous-jacente.
- **Synchronisation d'État Vocal** : Les indicateurs d'activité vocale (`isSpeaking`), les états muet/sourdine (`isMuted`, `isDeafened`) et les coordonnées spatiales sont synchronisés via des messages `VOICE_STATE_UPDATE`.
- **Modération par l'Hôte** : L'hôte peut envoyer des messages `VOICE_MODERATION_ACTION` (ex: mute forcé).

---

## 🚀 Utilisation dans une Application React

### 1. Importation du Module Vocal

```ts
import { useVoiceChat, VoiceChatPanel, VoiceBubble } from 'p2play-core/voice';
```

### 2. Intégration du Hook `useVoiceChat`

```tsx
import { usePeer } from 'p2play-core';
import { useVoiceChat, VoiceChatPanel } from 'p2play-core/voice';

export function GameWithVoice() {
  const { peerManager, myPeerId, connectedPeers, isHost } = usePeer({
    namespacePrefix: 'mygame',
  });

  const voice = useVoiceChat({
    peer: peerManager.getPeer(),
    myPeerId,
    connectedPeers,
  });

  return (
    <div className="game-container">
      {/* Panneau de contrôle du chat vocal */}
      <VoiceChatPanel
        voice={voice}
        isHost={isHost}
        compact={true}
      />
    </div>
  );
}
```

---

## 🎧 Audio Spatialisé 2D / 3D

`VoiceManager` intègre la Web Audio API pour positionner les voix des joueurs dans l'espace en fonction de leur position sur le plateau de jeu.

### Mise à jour de la position spatiale
```ts
// Définir la position du joueur local (x, y, z)
voice.setSpatialPosition(playerX, playerY, 0);
```

Le son s'atténue automatiquement selon la distance entre le joueur local et ses adversaires.

---

## 👤 Indicateurs Visuels Vocaux (`<VoiceBubble />`)

Pour afficher la bulle d'activité vocale (ex: contour vert animé quand le joueur parle) au-dessus de l'avatar :

```tsx
import { VoiceBubble } from 'p2play-core/voice';

<VoiceBubble
  peerId={player.peerId}
  voiceState={voice.states.find(s => s.peerId === player.peerId)}
  playerName={player.name}
  avatar={player.avatar}
/>
```
