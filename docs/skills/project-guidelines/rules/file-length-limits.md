# Rule: File Length Limits & Splitting Guidelines

To ensure readability and prevent files from becoming "god objects", we enforce limits on file sizes.

---

## The Rule

- **Ideal Target**: Under **300 lines of code** (including comments and imports).
- **Strict Limit**: Under **500 lines of code**.
- **Violation Action**: If a file exceeds 300 lines during a refactoring, feature addition, or creation, the agent **MUST** split it into smaller, logically cohesive files.

---

## Refactoring / Splitting Patterns

### In React / Frontend Code

When a Page or Component file exceeds 300 lines, it is usually because UI rendering, state variables, and fetch requests are coupled.

#### Before (Anti-Pattern): `MyPage.tsx` (600 lines)
- Render methods for 5 different tables/cards.
- 10 `useState` hooks and 4 `useEffect` queries/mutations.

#### After (Correct Pattern):
1. **Extract Custom Hook**: Create `hooks/useGamePhase.ts` containing the state transition and phase-specific logic.
2. **Extract Sub-components**: Extract panels like card rendering, negotiation dialogue, or lobby players lists into `src/components/game/`.
3. **Keep Main Component Lean**: The main board views should import sub-components and orchestrate them via custom hooks.
