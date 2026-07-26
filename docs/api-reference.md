# 📖 Référence de l'API `p2play-core`

Ce document présente la référence complète de l'API du package `p2play-core`, incluant le module réseau principal, le module spectateur et le module chat vocal WebRTC.

---

## 📦 Points d'Entrée (Exports ESM)

`p2play-core` propose 3 points d'entrée modulaires :

```ts
import { PeerManager, usePeer, PeerManagerLike } from 'p2play-core';
import { useSpectatorRole, isSpectator } from 'p2play-core/spectator';
import { useVoiceChat, VoiceChatPanel, VoiceBubble } from 'p2play-core/voice';
```

---

## 🌐 Module Principal (`p2play-core`)

### 1. Hook `usePeer<TState>(options?: UsePeerOptions<TState>)`

Le hook React principal pour gérer le réseau P2P dans vos composants.

#### Options (`UsePeerOptions<TState>`)
| Option | Type | Description |
| :--- | :--- | :--- |
| `externalPeerManager` | `PeerManagerLike<TState>` | Instance `PeerManager` transmise par le Hub (mode embarqué). |
| `namespacePrefix` | `string` | **Requis sans `externalPeerManager`**. Préfixe pour isoler les salons (ex: `"royal"`, `"pool"`). |
| `sounds` | `Record<string, (intensity?: number) => void>` | Mapping des identifiants SFX vers les fonctions de lecture audio locales. |
| `onCustomMessage` | `(msg: NetworkMessage) => void` | Handler pour capturer les messages personnalisés du réseau. |

#### Valeurs de retour
| Propriété / Méthode | Type | Description |
| :--- | :--- | :--- |
| `myPeerId` | `string \| null` | ID PeerJS du joueur local. |
| `hostPeerId` | `string \| null` | ID PeerJS de l'hôte de la partie. |
| `isHost` | `boolean` | `true` si le joueur local est l'hôte de la partie. |
| `connectedPeers` | `string[]` | Liste des IDs des pairs actuellement connectés. |
| `chatMessages` | `ChatMessage[]` | Historique des messages de chat reçus. |
| `gameState` | `TState \| null` | État courant du jeu synchronisé. |
| `setGameState` | `Dispatch<SetStateAction<TState \| null>>` | Setter React local pour `gameState`. |
| `customMessages` | `NetworkMessage[]` | Tampon des 20 derniers messages personnalisés reçus. |
| `status` | `'IDLE' \| 'CONNECTING' \| 'CONNECTED' \| 'DISCONNECTED'` | Statut de la connexion P2P. |
| `error` | `string \| null` | Message d'erreur éventuel. |
| `hostGame(customRoomId?)` | `(customRoomId?: string \| null) => Promise<string>` | Initialise le pair en tant qu'hôte et crée un salon. |
| `joinGame(roomId)` | `(roomId: string) => Promise<string>` | Rejoint un salon distant via son code de salon. |
| `sendAction(actionName, payload?)` | `(actionName: string, payload?: any) => void` | Envoie une action au joueur hôte. |
| `sendChat(senderName, text)` | `(senderName: string, text: string) => void` | Diffuse un message de chat dans le salon. |
| `playSfx(sfxName, intensity?)` | `(sfxName: string, intensity?: number) => void` | Déclenche un son P2P chez tous les joueurs. |
| `disconnect()` | `() => void` | Ferme toutes les connexions P2P et détruit l'instance. |
| `peerManager` | `PeerManagerLike<TState>` | L'instance sous-jacente du gestionnaire réseau. |

---

### 2. Classe `PeerManager<TState>`

Classe de bas niveau gérant les connexions transport PeerJS WebRTC DataChannel.

#### Instanciation
```ts
const peerManager = new PeerManager({
  namespacePrefix: 'skull',
  peerjsDebug: 1, // 0: None, 1: Errors, 2: Warnings, 3: All
});
```

#### Méthodes Principales
- `initHost(customRoomId?: string | null): Promise<string>` : Initialise l'hôte P2P.
- `initClient(hostRoomId: string): Promise<string>` : Se connecte à l'hôte.
- `broadcast(message: NetworkMessage, excludePeerId?: string): void` : Envoie un paquet à tous les pairs connectés.
- `sendToHost(type: string, payload: Record<string, unknown>): void` : Transmet une demande à l'hôte.
- `sendAudio(sfx: string, intensity?: number): void` : Transmet un événement sonore.
- `sendChat(senderName: string, text: string): void` : Transmet un message de chat.
- `disconnect(): void` : Ferme la session.

---

### 3. Types de Messages Réseau (`NetworkMessage`)

```ts
export type NetworkMessage =
  | StateUpdateMessage
  | ChatMessage
  | AudioEventMessage
  | VoiceStateUpdateMessage
  | VoiceModerationActionMessage
  | { type: string; [key: string]: unknown };
```

---

## 👁️ Module Spectateur (`p2play-core/spectator`)

### `useSpectatorRole<TState>(options)`
Hook React pour gérer la séparation Joueur / Spectateur et la désinfection de l'état.

#### Options
- `peerManager`: Instance `PeerManagerLike<TState>`
- `isHost`: `boolean`
- `myPeerId`: `string | null`
- `gameState`: `TState | null`
- `sanitizeForViewer`: `(state: TState, viewerPeerId: string | null, spectatorConfig: SpectatorConfig) => TState`

#### Propriétés retournées
- `spectatorConfig`: `SpectatorConfig` (`{ spectators: string[]; lock: boolean }`)
- `currentRole`: `'PLAYER' | 'SPECTATOR'`
- `isCurrentSpectator`: `boolean`
- `assignRole(peerId: string, role: 'PLAYER' | 'SPECTATOR'): void`
- `toggleLock(): void`
- `sanitizedGameState`: `TState | null` (État nettoyé des informations secrètes)

---

## 🎙️ Module Chat Vocal (`p2play-core/voice`)

### `useVoiceChat(options)`
Hook React pour gérer le maillage WebRTC audio et la communication vocale P2P.

#### Options
- `peer`: Instance `Peer | null` de PeerJS
- `myPeerId`: `string | null`
- `connectedPeers`: `string[]`

#### Propriétés retournées
- `isInitialized`: `boolean`
- `isMuted`: `boolean`
- `isDeafened`: `boolean`
- `states`: `VoiceParticipantState[]`
- `toggleMute()`: `() => void`
- `toggleDeafen()`: `() => void`
- `setVolume(peerId: string, volume: number)`: `void`
- `setSpatialPosition(x: number, y: number, z?: number)`: `void`

---

### Composants UI Vocaux

#### `<VoiceChatPanel />`
Panneau de contrôle vocal avec gestion du volume, modération et retour visuel.
```tsx
<VoiceChatPanel
  voice={voice}
  playerNameMap={{ 'peer123': 'Alice' }}
  isHost={isHost}
  compact={false}
/>
```

#### `<VoiceBubble />`
Bulle d'indicateur audio d'avatar (par exemple au-dessus du joueur sur le plateau de jeu).
```tsx
<VoiceBubble
  peerId="peer123"
  voiceState={voice.states.find(s => s.peerId === "peer123")}
  playerName="Alice"
  avatar="👑"
/>
```
