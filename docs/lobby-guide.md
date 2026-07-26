# 🏠 Shared Home Lobby (`P2PlayLobby`)

`P2PlayLobby` is the shared **standalone home screen** (create / join room) used by the Hub and every P2Play game. It ships with built-in themes, URL invitation detection (`#/CODE` or `?room=`), voice toggle (optional), and Tailwind/`classes` overrides so each game keeps its visual identity.

> **Scope**: home screen only. The **connected room lobby** (ready checks, spectators, deck/config panels) stays game-specific.

---

## Install

```bash
npm install github:gab371/p2play-core#v0.3.1
```

```tsx
import { P2PlayLobby, LOBBY_THEMES } from "p2play-core";
```

---

## Minimal example

```tsx
import { P2PlayLobby } from "p2play-core";

export function HomeLobby({
  status,
  error,
  onHost,
  onJoin,
}: {
  status: string;
  error: string | null;
  onHost: (name: string, avatar: string) => void;
  onJoin: (name: string, avatar: string, roomCode: string) => void;
}) {
  return (
    <P2PlayLobby
      title="MY GAME"
      subtitle="Peer-to-Peer multiplayer"
      bannerEmoji="🎮"
      theme="violet"
      status={status}
      error={error}
      showVoiceToggle={false}
      compactHostSection
      joinLayout="side-by-side"
      onHost={onHost}
      onJoin={onJoin}
    />
  );
}
```

Wire `status` / `error` from `usePeer`. Prefer `onHost` / `onJoin` (or `onCreateRoom` / `onJoinRoom` if you need the generated room code on create).

---

## Themes

Built-in presets in `LOBBY_THEMES`:

| Key | Typical use |
| :--- | :--- |
| `violet` | Hub |
| `amber` | Sheriff, Royal Bluff, Billard |
| `red` | Skull & Roses |
| `emerald` | Custom / green brand |

Pass `theme="amber"` **even when** you override UI with Tailwind `classes` — invitation URL mode (`Invitation au Salon`) still uses theme colors for badge / copy.

You can also pass a custom `P2PlayLobbyTheme` object.

---

## Important props

| Prop | Notes |
| :--- | :--- |
| `defaultUsername` | Defaults to `Joueur_XXX`. Pass `""` to force an empty field (`??` coalescing). |
| `showCharacterCounter` | Default `true`. Set `false` to hide `n/max`. |
| `showVoiceToggle` | Default `true`. Games usually set `false` (voice lives in Hub). |
| `compactHostSection` | `true` = single create button (no voice box). |
| `joinLayout` | `"stacked"` \| `"side-by-side"` (code + join). |
| `bannerFollowsAvatar` | Header emoji tracks selected avatar (Hub). |
| `subtitleTransform` | `"uppercase"` (default) \| `"none"`. |
| `classes` | Partial Tailwind map (`root`, `title`, `createButton`, `urlNotice`, …). When a key is set, inline theme styles for that node are skipped. |
| `renderAvatarSelector` | Replace the default emoji grid (Hub custom tabs). |

---

## Styling pattern (recommended)

1. Pick the closest `theme` for invitation / fallback colors.
2. Pass `classes` with your game Tailwind tokens (same approach as Sheriff).
3. Always style `urlNotice` so deep-link invitation matches the saloon / table look.

Reference implementations:

- Hub: `hub-p2play/src/components/game/Lobby.tsx`
- Sheriff: `Sherif-de-Nottingham/src/components/game/Lobby.tsx`
- Skull / Royal / Billard: their `Lobby.tsx` / `LobbyHome.tsx` / `LobbyVariantB.tsx`

---

## URL invitation mode

If the URL contains a room code (`#/ABCDE` or query helpers from `p2play-core/url`), the lobby switches to invitation UI:

- Shows detected code badge
- Primary CTA: join that room
- Secondary: clear code and return to create / manual join

`P2PlayLobby` listens to `hashchange` / `popstate`, so editing the room hash in the same tab updates the invitation UI without a full reload. If you are already connected to another room, `usePeer` / Hub reload the page so PeerJS can join the new code cleanly.

Theme + `classes.urlNotice` must match the game brand (avoid leaving default violet on an amber game).

### Address-bar sync

`usePeer.hostGame` / `joinGame` call `syncRoomUrlToAddressBar(roomCode)` so the location becomes e.g. `http://localhost:3004/#/QTYFT`. Disconnect clears it via `clearRoomUrlFromAddressBar()`. The Hub does the same on connect/disconnect.

```tsx
import { copyRoomUrlToClipboard, syncRoomUrlToAddressBar } from "p2play-core/url";

await copyRoomUrlToClipboard(hostPeerId);
```

---

## Hub vs game

| Context | Home lobby | Connected lobby |
| :--- | :--- | :--- |
| Hub | `P2PlayLobby` (`theme="violet"`, voice toggle on) | Hub room UI (game picker, players) |
| Standalone game | `P2PlayLobby` themed + `classes` | Game-specific (ready, spectators, config) |
| Embedded in Hub | Home lobby **bypassed** | Game config lobby if any, then board |

Do **not** reimplement PeerJS host/join forms — reuse `P2PlayLobby` + `usePeer`.
