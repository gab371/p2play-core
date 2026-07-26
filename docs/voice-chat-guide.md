# 🎙️ WebRTC P2P Voice Chat Guide (`p2play-core/voice`)

`p2play-core` provides a serverless P2P voice chat solution operating over a dynamic mesh of WebRTC audio calls between peers.

---

## 🏗️ Voice Network Architecture

- **Zero-Server Audio Mesh**: Each player streams their microphone audio directly to connected peers via the underlying PeerJS instance.
- **Voice State Sync**: Mute/deafen toggles (`isMuted`, `isDeafened`), voice activity indicators (`isSpeaking`), and spatial coordinates are synchronized via `VOICE_STATE_UPDATE` packets.
- **Host Moderation**: Host can issue `VOICE_MODERATION_ACTION` packets (e.g., force mute).

---

## 🚀 React Application Usage

### 1. Import Voice Module

```ts
import { useVoiceChat, VoiceChatPanel, VoiceBubble } from 'p2play-core/voice';
```

### 2. Use `useVoiceChat` Hook

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
      {/* Voice Control Panel */}
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

## 🎧 2D / 3D Spatial Audio

`VoiceManager` integrates the Web Audio API to position player voices in virtual space based on their game board coordinates.

### Updating Spatial Position
```ts
// Set local player spatial position (x, y, z)
voice.setSpatialPosition(playerX, playerY, 0);
```

Audio volume attenuates naturally with distance between players.

---

## 👤 Voice Indicator Visuals (`<VoiceBubble />`)

Render active speaking indicators (e.g. green animated ring when talking) over player avatars:

```tsx
import { VoiceBubble } from 'p2play-core/voice';

<VoiceBubble
  peerId={player.peerId}
  voiceState={voice.states.find(s => s.peerId === player.peerId)}
  playerName={player.name}
  avatar={player.avatar}
/>
```
