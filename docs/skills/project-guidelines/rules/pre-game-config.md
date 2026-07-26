# Rule: Pre-Game Configuration (Deck, Extensions & Helper Options)

Any sub-game of the P2Play ecosystem that exposes **pre-game configuration** — selectable decks, extensions/variants, or gameplay helper toggles — MUST follow the same pattern across `core`, `network`, `hooks`, and `components`. This keeps configuration reusable per game (Royal Bluff, Skull & Roses, Sheriff & Smugglers, …) and consistent inside the Hub.

This rule complements [hub-integration.md §4](/.agents/skills/project-guidelines/rules/hub-integration.md): the Hub mounts the sub-game which renders its **own** config lobby before `engine.startGame()` is called.

---

## 1. Core: declarative deck/option definitions

Put all selectable content in a single pure-TS module under `src/core/` (e.g. `decks.ts`). It must contain **no** React or PeerJS imports so it stays unit-testable.

```typescript
// src/core/decks.ts
import type { Character, ActionType } from "./types";

export type DeckId = 'CLASSIC' | 'REFORMATION';

export interface DeckDefinition {
  id: DeckId;
  name: string;
  shortName: string;
  description: string;
  characters: Character[];          // roles in play
  copiesPerCharacter: number;
  roleActions: ActionType[];        // role actions enabled by this deck
  blockOptions: Partial<Record<ActionType, Character[]>>; // who can block what
}

export const DECKS: Record<DeckId, DeckDefinition> = { /* … */ };
export const DEFAULT_DECK_ID: DeckId = 'CLASSIC';
export const getDeck = (id: DeckId): DeckDefinition => DECKS[id] ?? DECKS[DEFAULT_DECK_ID];
export const getBlockOptions = (deckId: DeckId, action: ActionType): Character[] =>
  getDeck(deckId).blockOptions[action as keyof typeof deck.blockOptions] ?? [];
```

**Rules:**
- Never hardcode the deck composition inside `gameEngine.ts`. `startGame()` must build the deck from `getDeck(state.config.deckId)`.
- Role/action resolution (`getRequiredCharacterForAction`, `isBlockAllowed`, block option lists) must be **deck-aware**: read from the active `DeckDefinition`, not from a hardcoded `switch`.
- Adding a new deck/extension = adding one entry to `DECKS` (+ new `Character`/`ActionType`/phase only if the extension introduces new mechanics). No engine refactor required.

---

## 2. Core: config lives on `GameState`

Configuration is part of the authoritative state so it is broadcast to every peer and survives re-renders.

```typescript
// src/core/types.ts
export interface GameConfig {
  deckId: DeckId;
  actionHelper: boolean; // green borders on block-capable cards, info bubbles, etc.
}

export interface GameState {
  // …
  config: GameConfig;
}
```

```typescript
// src/core/gameEngine.ts
public setConfig(partial: Partial<GameConfig>): boolean {
  if (this.state.phase !== 'LOBBY') return false;        // config only before launch
  if (partial.deckId && getDeck(partial.deckId).id !== partial.deckId) return false;
  this.state.config = { ...this.state.config, ...partial };
  return true;
}
```

- `createInitialState()` seeds `config` with `DEFAULT_DECK_ID` and a sensible default for every helper toggle.
- `setConfig` is **lobby-only**: reject any change once `phase !== 'LOBBY'`.
- `resetToLobby()` must NOT wipe `config` (players keep their chosen deck between rematches); only reset match state (`pendingAction`, `pendingLoss`, `exchangeCards`, `inquisitionReveal`, …).

---

## 3. Network: broadcast config & validate host authority

- Add a `CHANGE_CONFIG` client action (and any action needed by extension mechanics, e.g. `INQUISITION_DECIDE`).
- The host is the single source of truth: `hostActionHandler` applies `engine.setConfig(payload.config)` **only when `playerId === myPeerId`**, then `broadcastSanitizedStates`.
- `sanitizeGameState` must sanitize any per-viewer secret introduced by an extension (e.g. Royal Bluff's `inquisitionReveal` is only sent to `reveal.actorUid`).

```typescript
case 'CHANGE_CONFIG':
  if (playerId === myPeerId) engine.setConfig(payload.config);
  break;
```

```typescript
// Client callback
const changeConfig = useCallback((config: Partial<GameConfig>) => {
  sendAction('CHANGE_CONFIG', { config });
}, [sendAction]);
```

---

## 4. Hooks: never auto-start a game that has pre-game config

In embedded mode, populate players from `peerManager.lobbyPlayers` but **stay in `LOBBY`**. The host triggers `startGame()` from the lobby's *Lancer la Partie* button. This is the anti-pattern already documented in [hub-integration.md §4](/.agents/skills/project-guidelines/rules/hub-integration.md) — repeated here because it is the #1 cause of skipped deck selection.

```typescript
if (options?.isEmbedded && options?.externalPeerManager && engine.state.phase === 'LOBBY') {
  setTimeout(() => {
    // populate players …
    // NE PAS appeler engine.startGame() ici.
    broadcastSanitizedStates(engine.state);
  }, 0);
}
```

---

## 5. UI: config panel in the lobby, helper visuals gated by config

The lobby component renders a **Configuration Panel** (deck picker + helper toggle). Only the host can edit; other players see the active value read-only.

```tsx
interface LobbyProps {
  // …
  config?: GameConfig;
  onChangeConfig?: (partial: Partial<GameConfig>) => void;
}
```

- Deck picker: one button/card per `Object.values(DECKS)` entry, showing `name` + `description`.
- Helper toggle: a switch bound to `config.actionHelper`; `onChangeConfig?.({ actionHelper: !value })`.
- Pass `disconnect={isEmbedded && onExit ? onExit : disconnect}` so the embedded lobby never kills the Hub's PeerJS connection.

In the gameplay component:
- Read `config.actionHelper` and **gate** every helper visual behind it (green borders on block-capable cards, `ⓘ` info badges, extra tooltips). When disabled, the board must look like the unassisted classic game.
- Read `config.deckId` to show/hide extension-only action buttons (e.g. Inquisition only when `deckId === 'REFORMATION'`).
- Use `getBlockOptions(deckId, action)` for the block buttons and the green-border highlight — never a hardcoded `switch`.

---

## 6. Tests & docs

- Add an engine test per deck/extension: assert deck size (`copiesPerCharacter × characters`), new action flow, challenge resolution, and that the helper toggle does not affect engine state.
- Update the in-game **Règles** modal and the project README with the new deck(s), extension role(s), and the helper toggle description.

---

## 7. Reusing this for a new game (checklist)

When adding decks/extensions to another game (e.g. Skull & Roses):

1. Create `src/core/decks.ts` with a `DeckId`, `DeckDefinition`, `DECKS`, `getDeck`, and any deck-aware helper (`getBlockOptions` equivalent).
2. Add `GameConfig { deckId; …helper toggles }` to `GameState`; seed it in `createInitialState()`; add `engine.setConfig()` (lobby-only).
3. Make role/action/block resolution read from the active deck definition instead of hardcoded switches.
4. Add a `CHANGE_CONFIG` network action; host-only apply + broadcast; sanitize any new per-viewer secret.
5. Render a config panel in the lobby (host edits, others read); gate helper visuals and extension-only UI behind `config`.
6. Keep embedded mode in `LOBBY` — never auto-start.
7. Add engine tests for each deck and update the Rules modal/README.

---

## 8. Optional spectator mode (`p2play-core/spectator`)

Spectator support is **not required**. When a game opts in:

- Prefer helpers from `p2play-core/spectator` (`canChangeRole`, `spectatorConfigFromIds`, `assignLateJoinerAsSpectator`, …) instead of duplicating lock/role rules.
- Keep card fog-of-war in the game’s own `sanitizeState*` — the core only documents the `SanitizeForViewer` contract.
- Works identically in standalone and Hub (Hub only relays `gameConfig`).
