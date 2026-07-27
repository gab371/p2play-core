# Rule: Decoupled Architecture (Core, Network, UI)

We structure our React application to isolate pure game rules (domain) from network frameworks (PeerJS) and UI components (React/Shadcn).

---

## Architecture Structure

The codebase is organized as follows:

```
src/
├── core/               # 1. LOGIQUE METIER PURE (Zéro dépendance React / PeerJS)
│   ├── types.ts        # Interfaces TS (Card, Player, GameState)
│   ├── cards.ts        # Définition des types de cartes, pioche et défausse
│   ├── gameEngine.ts   # Moteur de règles (tours, phases, validations)
│   └── scoring.ts      # Calcul pur des points de fin de partie
│
├── network/            # 2. COUCHE RESEAU (protocol jeu + transport partagé)
│   └── protocol.ts     # ActionTypes + sanitize (anti-triche) — spécifiques au jeu
│                       # Transport PeerJS : package `p2play-core` (PeerManager, enveloppes CHAT/AUDIO/STATE_UPDATE)
│
├── hooks/              # 3. GLUE REACT (Hooks personnalisés)
│   ├── useGame.ts      # Liaison entre l'état de jeu core et le cycle de vie React
│   └── usePeer.ts      # Thin wrapper autour de `usePeer` de `p2play-core` (namespacePrefix + sounds map)
│
└── components/         # 4. INTERFACE UTILISATEUR (React + Shadcn UI)
    ├── ui/             # Composants génériques Shadcn (dialog, button, badge)
    └── game/           # Vues de plateau de jeu (Lobby, Board, InspectionPanel)
```

---

## Key Dependency Rules

1. **Core Independence**: Pure game rules inside `src/core/` must never import anything from `network/`, `hooks/`, or `components/`. It must be 100% testable using Node. Exception: optional helpers from `p2play-core/spectator` and `p2play-core/presence` (pure TS, no React — e.g. `remapRecordKey`) are allowed in `core/` for role/lock / reconnect remap logic.
2. **Network Decoupling**: Game-specific packets live in `src/network/protocol.ts`. Shared PeerJS transport comes from **`p2play-core`** (`PeerManager`, `PeerManagerLike`, generic envelopes). Do not re-copy `peerManager.ts` into each game.
3. **UI Ignorance**: UI components in `components/` should not know about PeerJS socket descriptors or raw connection handling. They consume reactive states and dispatch actions via custom hooks.
4. **Standalone-first**: `p2play-core` works without the Hub. Hub handover uses `externalPeerManager: PeerManagerLike`.
5. **Spectator opt-in**: Import `p2play-core/spectator` only if the game supports spectator mode; never required.
6. **Presence opt-in**: Host grace / `REQUEST_RECONNECT` / JOIN seat policy live in `p2play-core/presence` (`attachPresenceHandlers`). Do not duplicate grace timers in each `useGame`. Game-specific remap stays in the engine.