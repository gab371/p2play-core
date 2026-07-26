# Rule: Component Responsibility & Composition Guidelines

To keep our codebase healthy, all modifications must respect the rules of component separation and React clean code guidelines.

---

## 1. Single Responsibility (SRP)
*Each hook, function, or component should do one thing and do it well.*

- **Game Logic vs UI**: A component rendering the cards in the player's hand should not manage P2P payload formatting or PeerJS socket lifecycle. Extract networking/state into a hook and keep the component focused on rendering.
- **Rules separation**: Shuffling, scoring, and engine validations are kept in pure TypeScript modules (under `src/core/`) so they can be tested independently of React.

---

## 2. Open-Closed (Extensibility via Config)
*Code structures should be extensible without modifying existing core logic.*

- **Card Definitions**: Define card attributes dynamically in `cards.ts` using configurations instead of writing hardcoded `if/else` checks for specific card IDs inside the game engine. Adding a new card type should only require adding an entry to the card configuration record.

---

## 3. Narrow Interfaces (Props Segregation)
*Components should not depend on data structures they do not use.*

- **Avoid state pollution**: Do not pass the entire `GameState` object to simple display components (like a `Card` or a `ScoreBadge`). Design narrow, specific interfaces/props for each component.

---

## 4. Dependency Inversion (Callbacks & Hooks)
*Depend on abstractions (props/callbacks) rather than concrete network implementations.*

- **Testable UI**: In components, avoid importing PeerJS client instances or managers directly. Receive actions and state through props or generic custom hooks. This allows you to test or render the component in isolation.
