# 📖 `p2play-core` API Reference

This document provides a comprehensive reference for the `p2play-core` package, including core P2P networking, the Spectator module, and WebRTC Voice Chat.

---

## 📦 Entry Points (ESM Exports)

`p2play-core` provides 3 modular entry points:

```ts
import { PeerManager, usePeer, PeerManagerLike } from 'p2play-core';
import { useSpectatorRole, isSpectator } from 'p2play-core/spectator';
import { useVoiceChat, VoiceChatPanel, VoiceBubble } from 'p2play-core/voice';
```

---

## 🌐 Core Module (`p2play-core`)

### 1. `usePeer<TState>(options?: UsePeerOptions<TState>)` Hook

The primary React hook for managing P2P connections in your components.

#### Options (`UsePeerOptions<TState>`)
| Option | Type | Description |
| :--- | :--- | :--- |
| `externalPeerManager` | `PeerManagerLike<TState>` | `PeerManager` instance injected by Hub (embedded mode). |
| `namespacePrefix` | `string` | **Required without `externalPeerManager`**. Unique namespace prefix preventing broker room collisions (e.g. `"royal"`, `"pool"`). |
| `sounds` | `Record<string, (intensity?: number) => void>` | Mapping of SFX names to local audio play functions. |
| `onCustomMessage` | `(msg: NetworkMessage) => void` | Event handler capturing non-core custom network packets. |

#### Return Values
| Property / Method | Type | Description |
| :--- | :--- | :--- |
| `myPeerId` | `string \| null` | PeerJS ID of local player. |
| `hostPeerId` | `string \| null` | PeerJS ID of game host. |
| `isHost` | `boolean` | `true` if local player is game host. |
| `connectedPeers` | `string[]` | Array of currently connected peer IDs. |
| `chatMessages` | `ChatMessage[]` | Text chat history. |
| `gameState` | `TState \| null` | Synchronized current game state. |
| `setGameState` | `Dispatch<SetStateAction<TState \| null>>` | Local React setter for `gameState`. |
| `customMessages` | `NetworkMessage[]` | Ring buffer of last 20 custom network messages. |
| `status` | `'IDLE' \| 'CONNECTING' \| 'CONNECTED' \| 'DISCONNECTED'` | Current P2P connection status. |
| `error` | `string \| null` | Connection or protocol error message. |
| `hostGame(customRoomId?)` | `(customRoomId?: string \| null) => Promise<string>` | Initializes peer as host and creates room. |
| `joinGame(roomId)` | `(roomId: string) => Promise<string>` | Joins remote host room by room code. |
| `sendAction(actionName, payload?)` | `(actionName: string, payload?: any) => void` | Sends game action packet to host. |
| `sendChat(senderName, text)` | `(senderName: string, text: string) => void` | Broadcasts text chat message to room. |
| `playSfx(sfxName, intensity?)` | `(sfxName: string, intensity?: number) => void` | Triggers P2P sound effect across all players. |
| `disconnect()` | `() => void` | Closes P2P connections and cleans up instance. |
| `peerManager` | `PeerManagerLike<TState>` | Underlying peer manager instance. |

---

### 2. `PeerManager<TState>` Class

Low-level transport manager handling PeerJS WebRTC DataChannels.

#### Constructor
```ts
const peerManager = new PeerManager({
  namespacePrefix: 'skull',
  peerjsDebug: 1, // 0: None, 1: Errors, 2: Warnings, 3: All
});
```

#### Key Methods
- `initHost(customRoomId?: string | null): Promise<string>`: Initializes host instance.
- `initClient(hostRoomId: string): Promise<string>`: Connects client to host.
- `broadcast(message: NetworkMessage, excludePeerId?: string): void`: Sends packet to all connected peers.
- `sendToHost(type: string, payload: Record<string, unknown>): void`: Sends request packet to host.
- `sendAudio(sfx: string, intensity?: number): void`: Sends SFX trigger event.
- `sendChat(senderName: string, text: string): void`: Sends text chat message.
- `disconnect(): void`: Closes session.

---

## 👁️ Spectator Module (`p2play-core/spectator`)

### `useSpectatorRole<TState>(options)`
React hook managing Player / Spectator separation and state sanitization.

#### Options
- `peerManager`: `PeerManagerLike<TState>`
- `isHost`: `boolean`
- `myPeerId`: `string | null`
- `gameState`: `TState | null`
- `sanitizeForViewer`: `(state: TState, viewerPeerId: string | null, spectatorConfig: SpectatorConfig) => TState`

#### Return Values
- `spectatorConfig`: `SpectatorConfig` (`{ spectators: string[]; lock: boolean }`)
- `currentRole`: `'PLAYER' | 'SPECTATOR'`
- `isCurrentSpectator`: `boolean`
- `assignRole(peerId: string, role: 'PLAYER' | 'SPECTATOR'): void`
- `toggleLock(): void`
- `sanitizedGameState`: `TState | null` (Scrubbed state sanitized for spectator/rival viewing)

---

## 🎙️ Voice Chat Module (`p2play-core/voice`)

### `useVoiceChat(options)`
React hook managing WebRTC audio mesh network and voice controls.

#### Options
- `peer`: PeerJS `Peer | null`
- `myPeerId`: `string | null`
- `connectedPeers`: `string[]`

#### Return Values
- `isInitialized`: `boolean`
- `isMuted`: `boolean`
- `isDeafened`: `boolean`
- `states`: `VoiceParticipantState[]`
- `toggleMute()`: `() => void`
- `toggleDeafen()`: `() => void`
- `setVolume(peerId: string, volume: number)`: `void`
- `setSpatialPosition(x: number, y: number, z?: number)`: `void`

---

### Voice UI Components

#### `<VoiceChatPanel />`
Voice control panel with volume sliders, spatial audio toggles, and moderation tools.
```tsx
<VoiceChatPanel
  voice={voice}
  playerNameMap={{ 'peer123': 'Alice' }}
  isHost={isHost}
  compact={false}
/>
```

#### `<VoiceBubble />`
Floating voice activity bubble for player avatars on game boards.
```tsx
<VoiceBubble
  peerId="peer123"
  voiceState={voice.states.find(s => s.peerId === "peer123")}
  playerName="Alice"
  avatar="👑"
/>
```
