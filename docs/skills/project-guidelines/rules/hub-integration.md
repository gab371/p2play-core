# Rule: Persistent Hub Integration (`hub-p2play`) & `p2play-core`

To allow any game to be mounted dynamically inside the unified `hub-p2play` (SPA without iFrames) while remaining 100% playable in standalone mode, every game's components and build configurations MUST use the unified **[`p2play-core`](https://github.com/gab371/p2play-core)** library and adhere to the following rules.

---

## 1. Unified Network Engine (`p2play-core`)

All games in the P2Play ecosystem MUST declare `p2play-core` dependency in `package.json`:

```json
"dependencies": {
  "p2play-core": "github:gab371/p2play-core#v0.3.1"
}
```

Reference Documentation:
- ðŸ“– **[`p2play-core` API Reference](https://github.com/gab371/p2play-core/blob/main/docs/api-reference.md)**
- ðŸ  **[Shared Lobby Guide (`P2PlayLobby`)](https://github.com/gab371/p2play-core/blob/main/docs/lobby-guide.md)**
- ðŸ‘ï¸ **[Spectator Guide (`p2play-core/spectator`)](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)**
- ðŸŽ™ï¸ **[Voice Chat Guide (`p2play-core/voice`)](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)**

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

// Lib build: force a single React instance (Hub embed). Dual React â†’ useRef null.
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
    sounds: { /* map sfx â†’ soundManager */ },
  });
}
```

When `externalPeerManager` is passed, `usePeer` reuses Hub's WebRTC session seamlessly.

---

## 5. Shared Home Lobby (`P2PlayLobby`)

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

See [lobby-guide.md](../../lobby-guide.md).

---

## 6. Direct Local Lobby Bypass + Embedded Pre-Game Configuration Lobby

Hub manages game selection and player gathering in its own room. Sub-games MUST NOT re-display their local home screen (username form, join code).

When `isEmbedded={true}` and `externalPeerManager` are provided:
1. Sub-game **bypasses local home screen**.
2. Host automatically populates engine player list from `peerManager.lobbyPlayers` **but stays in `LOBBY` phase** if game features pre-game deck/rule configuration.
3. If game has no pre-game configuration, host may launch game directly.

---

## 7. Embedded Lobby Exit Button -> `onExit` (Not `disconnect`)

In embedded mode, WebRTC connection belongs to Hub (`externalPeerManager`). Sub-game MUST NOT destroy this connection. Exit buttons must invoke `onExit` (return to Hub) and NEVER `game.disconnect` / `peerManager.disconnect`.

---

## 8. Voice Chat & Spectator Mode

For games requiring voice chat or spectator features:
- **Voice Chat**: Use `useVoiceChat`, `<VoiceChatPanel />`, and `<VoiceBubble />` from `p2play-core/voice`.
- **Spectator Mode**: Use `useSpectatorRole` and `sanitizeForViewer` from `p2play-core/spectator`.
