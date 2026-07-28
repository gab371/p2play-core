---
name: project-guidelines
description: Core project-specific guidelines for Le Shérif d'El Paso and the P2Play Hub. Guides file length restrictions, architecture (Domain, Network, UI separation), p2play-core integration (PeerJS, Spectator, Voice, Session, Presence), WebRTC handover, direct lobby bypass, and React composition best practices in a Vite + React + TS + PeerJS stack.
---

# Project Guidelines

This skill defines the coding standards, architectural patterns, and code structure rules for the P2Play ecosystem (Le Shérif d'El Paso, Royal Bluff, Skull & Roses, Billard P2Play, and hub-p2play). Every agent modifying or adding code to these projects MUST read and adhere to these guidelines.

## Overview

To prevent technical debt, keep components readable, and guarantee seamless game integration inside the P2Play Hub without iFrames, we enforce primary rules:
1. **File Length Limits**: Files must remain under 300 lines of code. Files exceeding this threshold must be refactored and modularized.
2. **Decoupled Architecture (Separation of Concerns)**: Absolute separation between Core Domain (pure game logic, rules, types), Network/Infrastructure (`p2play-core` connection protocol), and Application/UI (React components and hooks).
3. **Unified Network & Capabilities (`p2play-core`)**: All networking, WebRTC peer management, spectator roles, voice chat, session persistence, and presence/reconnect MUST rely on the [`p2play-core`](https://github.com/gab371/p2play-core) shared package (≥ **v0.5.0**).
4. **Single Responsibility & Composition**: React components and hooks should focus on a single job, delegating layout and state using compound components, custom hooks, and composition patterns.
5. **Hub Handover & Direct Bypass**: Games integrated into the P2Play Hub must support dual builds (standalone HTML vs lib ES module), synchronous `PeerManagerLike` handover, full-screen canvas mounting, bypass of the local home screen (preserving pre-game config lobbies when applicable), and dual emote packs.

---

## Dependencies & Reference Skills

For technology-specific standards and shared capabilities, this skill references:

### Local-first skill resolution (mandatory)

When a referenced skill is needed, agents MUST **read the local `SKILL.md`** — never fetch the remote GitHub blob URL as the primary source (avoids repeated network fetches).

**Lookup order:**

1. **Repo / sibling local copy** — e.g. `.agents/skills/<name>/SKILL.md` or `../<name>/SKILL.md` next to this skill.
2. **User-level install** — `~/.agents/skills/<name>/SKILL.md` (or the Cursor user skills directory).
3. **Missing only** — install, then read the local file:
   ```bash
   npx skills add <owner/repo@skill> -g -y
   ```
   Then reopen the installed `SKILL.md` from step 1 or 2. Do **not** keep using the raw GitHub URL after install.

| Skill | Local path (preferred) | Install if missing |
| :--- | :--- | :--- |
| React & Next.js Best Practices | [../react-best-practices/SKILL.md](../react-best-practices/SKILL.md) | `npx skills add vercel-labs/agent-skills@react-best-practices -g -y` |
| React Component Composition | [../composition-patterns/SKILL.md](../composition-patterns/SKILL.md) | `npx skills add vercel-labs/agent-skills@composition-patterns -g -y` |
| UI Components & Shadcn | [../shadcn/SKILL.md](../shadcn/SKILL.md) | `npx skills add shadcn/ui -g -y` |
| Aesthetic & Design Guidelines | [../web-design-guidelines/SKILL.md](../web-design-guidelines/SKILL.md) | `npx skills add vercel-labs/agent-skills@web-design-guidelines -g -y` |

Upstream docs (optional, for humans — not for agent runtime reads): [skills.sh](https://skills.sh/).

### Package & Hub documentation

- **`p2play-core` Package & Documentation**:
  - [Main README](https://github.com/gab371/p2play-core/blob/main/README.md)
  - [API Reference](https://github.com/gab371/p2play-core/blob/main/docs/api-reference.md)
  - [Spectator Mode Guide](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)
  - [Voice Chat WebRTC Guide](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)
  - [Presence & Reconnect Guide](https://github.com/gab371/p2play-core/blob/main/docs/presence-guide.md)
- **Hub P2Play Documentation**:
  - [Hub Architecture](https://github.com/gab371/hub-p2play/blob/main/docs/architecture.md)
  - [Game Mount Contract](https://github.com/gab371/hub-p2play/blob/main/docs/game-mount-contract.md)
  - [Developer Guide for New Games](https://github.com/gab371/hub-p2play/blob/main/docs/developer-guide-new-game.md)

---

## Project-Specific Rules

Read the detailed rule markdown files for concrete examples and instructions:

1. **File Length & Splitting Rules**
   - [rules/file-length-limits.md](./rules/file-length-limits.md)
   - Exceeding 300 lines is an anti-pattern. Learn when and how to split modules.

2. **Architecture & Separation of Concerns Rules**
   - [rules/decoupled-architecture.md](./rules/decoupled-architecture.md)
   - Rules on separation of concerns, decoupling PeerJS/network logic from UI and Core rules.

3. **React Composition & Component Responsibility**
   - [rules/component-responsibility.md](./rules/component-responsibility.md)
   - Applying Single Responsibility, custom hooks, and React composition patterns.

4. **Pre-Game Configuration (Decks, Extensions & Helper Options)**
   - [rules/pre-game-config.md](./rules/pre-game-config.md)
   - Reusable pattern for selectable decks/extensions and gameplay helper toggles (`GameConfig` on `GameState`, host-only `CHANGE_CONFIG`, lobby config panel).

5. **Persistent Hub Integration & `p2play-core` (`hub-p2play`)**
   - [rules/hub-integration.md](./rules/hub-integration.md)
   - Network abstraction with `p2play-core`, mount contract, dual builds, voice, spectator, **presence / reconnect**, lobby bypass, and `process.env` polyfill.

---

## Common Pitfalls to Avoid

- **Reimplementing PeerJS or local `PeerManager` from scratch**: Always use `p2play-core` (`PeerManager`, `usePeer`, `PeerManagerLike`).
- **Reimplementing the standalone create/join home form**: Always use `<P2PlayLobby />` from `p2play-core`, with a matching `theme` + `classes` (incl. `urlNotice`). Connected-room lobbies stay game-specific.
- **Duplicating grace timers / REQUEST_RECONNECT in each `useGame`**: Always use `attachPresenceHandlers` from `p2play-core/presence`. Engine keeps only business `remapPlayerId`.
- **Combining Hooks and UI in one React file**: Always extract state management, event handling, and PeerJS subscriptions into custom hooks (e.g. `hooks/useGame.ts` or `hooks/usePeer.ts`).
- **Embedding PeerJS messaging logic inside UI components**: UI should not know about network packet parsing or raw PeerJS connection states. It should only interact with abstracted state/callbacks.
- **Putting game engine logic inside React state hooks**: Game rules (such as scoring, round calculation, deck shuffling) must reside in pure TypeScript modules (`src/core/`) and be tested independently of React.
- **Transmitting secret information to spectators or opponents**: Always use `sanitizeForViewer` (from `p2play-core/spectator`) to scrub hidden cards or secret roles before sending states to spectators or rivals.
- **Hardcoding deck composition or block options in the engine**: Selectable decks, extensions, and helper toggles must live in a declarative `src/core/decks.ts` and be read via `GameConfig` on `GameState`.
- **Hardcoding Deployment Base Path**: Never hardcode base paths in code or vite config; use relative bases (`base: './'`) to allow hosting on subfolders of GitHub and GitLab Pages.
- **Placing `define` inside `build` in `vite.config.ts`**: `define` must be placed at the root of the Vite configuration object, not nested inside `build`.
- **Auto-starting an embedded game that has pre-game configuration**: In embedded mode, populate players from `peerManager.lobbyPlayers` but stay in `LOBBY` phase — never call `engine.startGame()` automatically if the game exposes a pre-game config lobby. See [rules/hub-integration.md §6](./rules/hub-integration.md).
- **Destroying the Hub's PeerJS connection from an embedded sub-game**: In embedded mode, the PeerJS connection is owned by the Hub's `externalPeerManager`. Exit buttons must call `onExit` (return to Hub), never `game.disconnect` / `peerManager.disconnect`. See [rules/hub-integration.md §7](./rules/hub-integration.md).
- **Overwriting `onPeerStatusChange` without chaining**: Voice and presence chain previous handlers; wiping them breaks connectedPeers / voice cleanup.
