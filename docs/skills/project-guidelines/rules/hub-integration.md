# Rule: Persistent Hub Integration (`hub-p2play`) & `p2play-core`

To allow any game to be mounted dynamically inside the unified `hub-p2play` (SPA without iFrames) while remaining 100% playable in standalone mode, every game's components and build configurations MUST use the unified **[`p2play-core`](https://github.com/gab371/p2play-core)** library and adhere to the following rules.

---

## 1. Unified Network Engine (`p2play-core`)

All games in the P2Play ecosystem MUST declare `p2play-core` dependency in `package.json`:

```json
"dependencies": {
  "p2play-core": "github:gab371/p2play-core#v0.6.6"
}
```

Use `file:../p2play-core` only for local monorepo iteration; switch back to the GitHub tag before release. With either pin, keep Vite `resolve.dedupe: ["react", "react-dom"]`. After bumping the pin, force-refresh the lock if needed: `npm install p2play-core@github:gab371/p2play-core#v0.6.6` (plain `npm install` can keep an old resolved commit).

Reference Documentation:
- 📘 **[`p2play-core` API Reference](https://github.com/gab371/p2play-core/blob/main/docs/api-reference.md)**
- 🏠 **[Shared Lobby Guide (`P2PlayLobby`)](https://github.com/gab371/p2play-core/blob/main/docs/lobby-guide.md)**
- 👁️ **[Spectator Guide (`p2play-core/spectator`)](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)**
- 🎙️ **[Voice Chat Guide (`p2play-core/voice`)](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)**
- ♻️ **[Presence & Reconnect Guide (`p2play-core/presence`)](https://github.com/gab371/p2play-core/blob/main/docs/presence-guide.md)**
- 🔒 **[Network Security & Identity](./network-security.md)** (host-only sync, locked pseudos, `getTrustedUsername`)

---

## 2. Dual Build Mode (`standalone` & `lib`)

Each game must support two compilation modes:
- **Standalone Mode (`npm run build`)**: Produces full web app (`index.html` + assets) for standalone deployment.
- **Library Mode (`npx vite build --mode lib`)**: Produces single ES Module (`dist/index.js`) and unhashed stylesheet (`dist/<game>.css`), loadable and executable dynamically by Hub.

### Required `vite.config.ts` Configuration
```typescript
import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "fs"

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Lib build: force a single React instance (Hub embed). Dual React → useRef null.
const reactAliases = {
  react: path.resolve(__dirname, "node_modules/react"),
  "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
  "react-dom/client": path.resolve(__dirname, "node_modules/react-dom/client"),
  "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
  "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
};

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';
  return {
    base: './',
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        ...(isLib ? reactAliases : {}),
      },
    },
    // Root define prevents process.env runtime errors
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': '{}',
    },
    build: isLib ? {
      outDir: 'dist',
      lib: {
        entry: path.resolve(__dirname, 'src/main.tsx'),
        name: 'GameXxx',
        formats: ['es'],
        fileName: () => 'index.js'
      },
      rollupOptions: {
        output: { assetFileNames: 'style.css' },
      },
      // DO NOT externalize react/react-dom to ensure standalone ES module compatibility
    } : {
      outDir: 'dist'
    }
  }
});
```

---

## 3. Global Mount Contract (`window.mountXxx`)

Each game's `src/main.tsx` MUST expose a mount function on `window` accepting `p2play-core`'s `PeerManagerLike` type:

```typescript
import { createRoot } from 'react-dom/client';
import type { PeerManagerLike } from 'p2play-core';

export function mount(element: HTMLElement, options: { 
  peerId: string; 
  playerName?: string; 
  playerAvatar?: string; 
  externalPeerManager?: PeerManagerLike; 
  isEmbedded?: boolean; 
  onExit?: () => void; 
}) {
  const styleId = 'game-style-mygame';
  if (!document.getElementById(styleId)) {
    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = '/games/mygame/style.css';
    document.head.appendChild(link);
  }

  const root = createRoot(element);
  root.render(
    <StrictMode>
      <App
        isEmbedded={true}
        externalPeerManager={options.externalPeerManager}
        onExit={options.onExit}
        playerName={options.playerName}
        playerAvatar={options.playerAvatar}
      />
    </StrictMode>
  );
  return () => root.unmount();
}

// Expose on global window object
(window as any).mountMygame = mount;

const rootEl = document.getElementById('root');
if (import.meta.env.MODE !== 'lib' && rootEl && rootEl.children.length === 0) {
  createRoot(rootEl).render(<StrictMode><App /></StrictMode>);
}
```

---

## 4. `usePeer` Hook Usage (`p2play-core`)

Every game reuses `p2play-core`'s unified `usePeer` hook:

```typescript
import { usePeer as useCorePeer, type PeerManagerLike } from "p2play-core";

export function usePeer(options?: { externalPeerManager?: PeerManagerLike }) {
  return useCorePeer({
    externalPeerManager: options?.externalPeerManager,
    namespacePrefix: "royal", // Unique per game
    sounds: { /* map sfx → soundManager */ },
  });
}
```

When `externalPeerManager` is passed, `usePeer` reuses Hub's WebRTC session seamlessly.

Pass a real **profile** (`username` / `avatar`) into `hostGame` / `joinGame` so `p2play-core/session` stores the correct identity for reconnect.

---

## 5. Presence & Reconnect (`p2play-core/presence`)

Host-side disconnect / reconnect grace MUST use `attachPresenceHandlers` from `p2play-core/presence` (do **not** copy grace timers per game).

```ts
import {
  attachPresenceHandlers,
  createSeatEngine,
  handleJoinGameSeat,
  remapRecordKey,
} from "p2play-core/presence";
```

- Engine: `markDisconnected` / `isDisconnected` / `remapPlayerId` / `removePlayer` (+ `remapRecordKey` for flat maps).
- Host `useGame`: `createSeatEngine` + `attachPresenceHandlers({ onHostAction })` + `presence.dispose()`.
- `JOIN_GAME` → `handleJoinGameSeat` (refresh if already seated; spectator late-join when applicable).
- `attachPresenceHandlers` **chains** existing `onPeerStatusChange` (voice-safe).

Guides: [Presence & Reconnect](https://github.com/gab371/p2play-core/blob/main/docs/presence-guide.md) · [API Reference](https://github.com/gab371/p2play-core/blob/main/docs/api-reference.md)

**Boundary**: Hub party-room auto-rejoin after F5 is optional / future work. In-game presence works with the Hub-owned `externalPeerManager` the same way as standalone.

---

## 6. Shared Home Lobby (`P2PlayLobby`)

Standalone create/join screens MUST use `<P2PlayLobby />` from `p2play-core` (do not reimplement host/join forms). Connected-room UI (ready, spectators, deck config) remains game-specific.

```tsx
import { P2PlayLobby } from "p2play-core";

<P2PlayLobby
  theme="amber" // required for URL invitation colors even when using classes
  status={status}
  error={error}
  showVoiceToggle={false}
  compactHostSection
  joinLayout="side-by-side"
  onHost={onHost}
  onJoin={onJoin}
  classes={{ /* game Tailwind tokens incl. urlNotice */ }}
/>
```

See [lobby-guide.md](https://github.com/gab371/p2play-core/blob/main/docs/lobby-guide.md).

When styling lobby inputs/buttons against shadcn defaults, pass explicit `classes` resets (background, height, border) so theme tokens win over `dark:bg-input/30` / `h-8` defaults from `p2play-core/ui`.

---

## 7. Room URL Copy UI (`RoomCodeBadge` / `CopyRoomLinkButton`)

Do **not** ship a text “Copier le lien” button. Use shared controls from `p2play-core`:

```tsx
import { CopyRoomLinkButton, RoomCodeBadge } from "p2play-core";

// Connected lobby / Hub header: icon next to the code
<CopyRoomLinkButton code={hostPeerId} id="lobby-copy-btn" />

// In-game header: code + copy icon in one pill
<RoomCodeBadge code={hostPeerId} label="Salon" accentClassName="text-amber-400" />
```

Both call `copyRoomUrlToClipboard` and expose accessible labels (`Copier le lien d'invitation` → `Lien copié`).

---

## 8. Text Chat & Journal (`p2play-core/chat`)

Prefer shared panels over per-game chat shells:

```tsx
import { TextChatPanel, JournalPanel } from "p2play-core/chat";

<JournalPanel entries={journal} scrollbarAccent="amber" />
<TextChatPanel /* … */ scrollbarAccent="amber" />
```

`scrollbarAccent` drives scrollbar + default journal event color palettes (`journalEventStyles`). Override with `typeClassNames` only when a game needs custom event types.

**Identity:** the host rewrites `CHAT.sender` from lobby / `registerPeerProfile` (`resolveChatSender`). `sendChat(senderName, text)` ignores `senderName` for the wire label (≥ v0.6.5). On `JOIN_GAME`, pass `trustedName: peerManager.getTrustedUsername?.(playerId)`. See [network-security.md](./network-security.md).

---

## 9. Direct Local Lobby Bypass + Embedded Pre-Game Configuration Lobby

Hub manages game selection and player gathering in its own room. Sub-games MUST NOT re-display their local home screen (username form, join code).

When `isEmbedded={true}` and `externalPeerManager` are provided:
1. Sub-game **bypasses local home screen**.
2. Host automatically populates engine player list from `peerManager.lobbyPlayers` **but stays in `LOBBY` phase** if game features pre-game deck/rule configuration.
3. If game has no pre-game configuration, host may launch game directly.

---

## 10. Embedded Lobby Exit Button -> `onExit` (Not `disconnect`)

In embedded mode, WebRTC connection belongs to Hub (`externalPeerManager`). Sub-game MUST NOT destroy this connection. Exit buttons must invoke `onExit` (return to Hub) and NEVER `game.disconnect` / `peerManager.disconnect`.

---

## 11. Voice Chat & Spectator Mode

For games requiring voice chat or spectator features:
- **Voice Chat**: Use `useVoiceChat`, `<VoiceChatPanel />`, and `<VoiceBubble />` from `p2play-core/voice`.
- **Spectator Mode**: Use `useSpectatorRole` and `sanitizeForViewer` from `p2play-core/spectator`.

---

## 12. Hub Catalog Declaration (`hub-manifest.json`)

Games **self-declare** picker metadata. Do **not** put `name` / `desc` in Hub `games.json`.

1. Ship `public/hub-manifest.json` (Vite copies it into `dist`):

```json
{
  "key": "mygame",
  "name": "My Game",
  "emoji": "🎮",
  "desc": "Short pitch for the Hub picker.",
  "hasPreConfig": true,
  "avatars": ["🎮", "🎯", "🎲"],
  "shellBackground": "radial-gradient(circle at center, #1b0a0f 0%, #09090b 100%)"
}
```

2. Optionally validate with `defineHubGameManifest` from `p2play-core`.
3. Hub `games.json` only pins download: `{ "repo": "...", "version": "vX.Y.Z" }`. Keep pins in sync with each game’s `package.json` / release tag (e.g. skull/royal/pool `v0.6.4`, sheriff `v1.6.4`, uno `v0.1.6`).
4. `download-games.js` validates the manifest, writes `public/games/catalog.json`, and prunes orphan game folders.

**Local monorepo tips**
- `npm run catalog` (`download-games.js --catalog-only`) refreshes catalog without re-download.
- `npm run dev` **re-downloads** GitHub zips into `public/games/` and wipes local lib copies — use `npx vite` (or catalog-only) when testing locally built `dist` folders copied into `public/games/{key}/`.
- After lib builds, copy `dist/index.js` (+ `style.css`) into `public/games/{key}/` so Hub embeds the same bits you just fixed (stale zips hide sync/identity bugs).

Do **not** hardcode per-game avatars, labels, or shell backgrounds in Hub — those belong in `hub-manifest.json`.

---

## 13. Host actions & identity (embedded + standalone)

```ts
onHostAction: (senderPeerId, rawMsg) => {
  const msg = rawMsg as NetworkMessage;
  if (msg.type !== "ACTION") return;
  const playerId = senderPeerId; // never msg.playerId
  switch (msg.actionName) {
    case "JOIN_GAME":
      handleJoinGameSeat({
        engine: getSeatEngine(),
        playerId,
        payload: { name: msg.payload?.name, avatar: msg.payload?.avatar },
        trustedName: peerManager.getTrustedUsername?.(playerId),
        addPlayer: (id, name, avatar, isHost) => engine.addPlayer(id, name, avatar, isHost),
        addSpectator: (id, name, avatar) => engine.addSpectator(id, name, avatar),
      });
      break;
    // …
  }
  broadcastSanitizedStates(engine.state);
};
```

When broadcasting, mark both `player.id` and `conn.peer` as sent; do not skip peers with a fuzzy `endsWith` “already known” gate that can drop the only `STATE_UPDATE`.
