# Changelog

## 0.6.5

- Security: lock display names after first seat — `JOIN_GAME` / `refreshSeatedIdentity` can no longer rename; `REQUEST_RECONNECT` ignores client `username`.
- Security: `registerPeerProfile` is first-write-wins for username; `sendChat` ignores the client `senderName` argument.
- New `PeerManager.getTrustedUsername` for Hub-embedded joins (prefer salon pseudo over `payload.name`).
- Voice: ignore Radix slider pointer events in `useFloatingDrag` (volume slider no longer moves the floating panel).
- Voice: `MicOff` / `HeadphoneOff` badges on avatars when muted / deafened; deafen button uses `HeadphoneOff`.

## 0.6.4

- Security: clients only accept `STATE_UPDATE` / `CHAT` / voice / custom from the room host (mesh spoof blocked).
- Security: host rewrites `VOICE_STATE_UPDATE.peerId`; drops guest `VOICE_MODERATION_ACTION`.
- Security: `REGISTER_SESSION` + sessionToken check on `REQUEST_RECONNECT` (`token_mismatch`).

## 0.6.3

- Chat: host rewrites `CHAT.sender` from peer identity (`lobbyPlayers` / `registerPeerProfile`) — clients can no longer spoof another player's name.
- `PeerManager.registerPeerProfile` / `resolveChatSender`; optional `senderPeerId` on `ChatMessage`.

## 0.6.2

- `useFloatingDrag`: delay pointer capture until drag threshold; `onTap` opens the panel on click (fixes mute panel not opening when `draggable`).

## 0.6.1

- `VoiceChatPanel`: optional `draggable` (+ `dragStorageKey`) — Android-style floating bubble (drag + snap to left/right edge, position persisted).
- New `useFloatingDrag` helper exported from `p2play-core/voice`.

## 0.6.0

- New entry **`p2play-core/ui`**: shadcn-style primitives (`Button`, `Badge`, `Card`, `Dialog`, `Input`, `Slider`, `Avatar`, `Popover`, `Tooltip`, `Toggle`, `ScrollArea`, …) + shared **`SoundToggle`** (`soundManager` injected; key `p2play:sound:muted`).
- `TextChatPanel` / `JournalPanel`, `VoiceChatPanel` / `VoiceBubble`, and `P2PlayLobby` consume these primitives (Tailwind classes; apps must scan core in `tailwind.config` content).
- Dependencies: `radix-ui`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tslib`.

## 0.1.1

- Use named `import { Peer } from "peerjs"` for cleaner ESM interop.
- `sendToHost` retries briefly when the host data channel is not open yet (avoids silent drop right after join).
- Host may only force **spectator** role on others (never force player mode).

## 0.1.0

- Initial release: `PeerManager` (namespaced PeerJS transport), `PeerManagerLike`, generic envelopes (`CHAT` / `AUDIO_EVENT` / `STATE_UPDATE`), `usePeer` hook.
- Optional `p2play-core/spectator` module (roles, locks, late-join helpers, messages).
- Standalone-first: games work without the Hub; Hub injects `externalPeerManager`.
