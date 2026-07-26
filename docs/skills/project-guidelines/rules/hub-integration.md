# Rule: Intégration au Hub P2Play (hub-p2play) & `p2play-core`

Pour que n'importe quel jeu puisse être intégré dynamiquement au sein du hub unifié `hub-p2play` (en SPA sans iFrame) tout en restant utilisable à 100% de manière autonome en standalone, les composants et configurations de chaque jeu doivent obligatoirement utiliser la bibliothèque unifiée **[`p2play-core`](https://github.com/gab371/p2play-core)** et respecter les règles suivantes.

---

## 1. Moteur Réseau Unifié (`p2play-core`)

Tous les sous-jeux de l'écosystème P2Play doivent déclarer la dépendance `p2play-core` dans leur `package.json` :

```json
"dependencies": {
  "p2play-core": "github:gab371/p2play-core#v0.2.0"
}
```

Documentation de référence du package :
- 📖 **[Référence de l'API `p2play-core`](https://github.com/gab371/p2play-core/blob/main/docs/api-reference.md)**
- 👁️ **[Guide Spectateur (`p2play-core/spectator`)](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)**
- 🎙️ **[Guide Chat Vocal (`p2play-core/voice`)](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)**

---

## 2. Double Mode de Build (`standalone` & `lib`)

Chaque jeu doit pouvoir être compilé selon deux modes :
- **Mode Standalone (`npm run build`)** : Génère l'application web complète (`index.html` + assets) pour un déploiement autonome.
- **Mode Library (`npx vite build --mode lib`)** : Génère un ES Module unique (`dist/index.js`) et sa feuille de style (`dist/<game>.css`) sans hash, téléchargeable et exécutable dynamiquement par le Hub.

### Configuration `vite.config.ts` Requise
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
    // Remplacement obligatoire au niveau racine pour éviter "process is not defined" dans le navigateur
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
      // NE PAS externaliser react/react-dom afin de garantir l'autonomie ESM dans le navigateur
    } : {
      outDir: 'dist'
    }
  }
});
```

---

## 3. Contrat de Montage Global (`window.mountXxx`)

Le fichier `src/main.tsx` de chaque jeu doit exposer une fonction de montage sur `window` qui accepte le type `PeerManagerLike` de `p2play-core` :

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

// Exposition explicite sur window
(window as any).mountMygame = mount;

const rootEl = document.getElementById('root');
if (import.meta.env.MODE !== 'lib' && rootEl && rootEl.children.length === 0) {
  createRoot(rootEl).render(<StrictMode><App /></StrictMode>);
}
```

---

## 4. Utilisation du Hook `usePeer` (`p2play-core`)

Chaque jeu réutilise le hook unifié `usePeer` de `p2play-core` :

```typescript
import { usePeer as useCorePeer, type PeerManagerLike } from "p2play-core";

export function usePeer(options?: { externalPeerManager?: PeerManagerLike }) {
  return useCorePeer({
    externalPeerManager: options?.externalPeerManager,
    namespacePrefix: "royal", // unique par jeu
    sounds: { /* map sfx → soundManager */ },
  });
}
```

Lorsqu'un `externalPeerManager` est transmis par le Hub, le hook réutilise l'instance WebRTC active sans créer de doublon.

---

## 5. Bypass Direct de l'Accueil Local + Lobby de Configuration Embarqué

Le Hub gère la sélection du jeu et le rassemblement des joueurs dans son propre salon. Le sous-jeu ne doit donc **pas** ré-afficher son écran d'accueil local.

Lorsque `isEmbedded={true}` et `externalPeerManager` sont fournis :
1. Le sous-jeu **annule l'affichage de son écran d'accueil local** (formulaire pseudo / code / création de salon).
2. L'Hôte peuple automatiquement l'état du moteur depuis `peerManager.lobbyPlayers` **mais reste en phase `LOBBY`** : il **ne faut pas appeler `engine.startGame()` automatiquement** si le jeu présente un lobby de configuration.
3. Si le jeu n'a **aucune** configuration pré-partie, l'Hôte peut lancer la partie directement.

---

## 6. Bouton « Quitter » du Lobby Embarqué → `onExit` (et non `disconnect`)

En mode embarqué, la connexion PeerJS appartient au Hub (`externalPeerManager`). Le sous-jeu **ne doit jamais** détruire cette connexion lui-même. Le bouton « Quitter » doit appeler `onExit` (retour au Hub) et non `game.disconnect` / `peerManager.disconnect`.

---

## 7. Chat Vocal & Mode Spectateur

Pour les jeux nécessitant le chat vocal ou le mode spectateur :
- **Chat vocal** : Utilisez `useVoiceChat`, `<VoiceChatPanel />` et `<VoiceBubble />` depuis `p2play-core/voice`.
- **Mode Spectateur** : Utilisez `useSpectatorRole` et `sanitizeForViewer` depuis `p2play-core/spectator`.
