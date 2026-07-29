# Changelog

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
