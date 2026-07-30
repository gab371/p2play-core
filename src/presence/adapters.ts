import type { GameSeatEngine, SeatProfile, SeatedPlayerView } from "./types";

export interface PlayersSeatSource {
  isLobbyPhase(): boolean;
  isSpectator?(peerId: string): boolean;
  isDisconnected(peerId: string): boolean;
  markDisconnected(peerId: string): void;
  remapPlayerId(oldId: string, newId: string, profile?: SeatProfile): boolean;
  removePlayer(peerId: string): void;
  findSeatedPlayer(peerId: string): SeatedPlayerView | null;
  refreshSeatedIdentity(peerId: string, profile: { name?: string; avatar?: string }): void;
}

/** Thin adapter when the game engine already exposes seat methods. */
export function adaptPlayersEngine(source: PlayersSeatSource): GameSeatEngine {
  return {
    isLobbyPhase: () => source.isLobbyPhase(),
    isSpectator: source.isSpectator
      ? (id) => source.isSpectator!(id)
      : undefined,
    isDisconnected: (id) => source.isDisconnected(id),
    markDisconnected: (id) => source.markDisconnected(id),
    remapPlayerId: (o, n, p) => source.remapPlayerId(o, n, p),
    removePlayer: (id) => source.removePlayer(id),
    findSeatedPlayer: (id) => source.findSeatedPlayer(id),
    refreshSeatedIdentity: (id, profile) => source.refreshSeatedIdentity(id, profile),
  };
}

/**
 * Build a GameSeatEngine from a typical players[] + optional spectators[] state.
 * Remap / mark / remove stay on the game engine; this only wires seat lookups.
 */
export function createSeatEngine(opts: {
  getPhase: () => string;
  lobbyPhases?: string[];
  getPlayers: () => Array<{
    id: string;
    name?: string;
    avatar?: string;
    disconnected?: boolean;
  }>;
  getSpectators?: () => Array<{ id: string }>;
  markDisconnected: (peerId: string) => void;
  isDisconnected: (peerId: string) => boolean;
  remapPlayerId: (oldId: string, newId: string, profile?: SeatProfile) => boolean;
  removePlayer: (peerId: string) => void;
}): GameSeatEngine {
  const lobby = new Set(opts.lobbyPhases ?? ["LOBBY"]);
  return {
    isLobbyPhase: () => lobby.has(opts.getPhase()),
    isSpectator: opts.getSpectators
      ? (id) => opts.getSpectators!().some((s) => s.id === id)
      : undefined,
    isDisconnected: opts.isDisconnected,
    markDisconnected: opts.markDisconnected,
    remapPlayerId: opts.remapPlayerId,
    removePlayer: opts.removePlayer,
    findSeatedPlayer: (peerId) => {
      const p = opts.getPlayers().find((pl) => pl.id === peerId);
      if (!p) return null;
      return {
        name: p.name,
        avatar: p.avatar,
        disconnected: p.disconnected,
      };
    },
    refreshSeatedIdentity: (peerId, profile) => {
      const p = opts.getPlayers().find((pl) => pl.id === peerId);
      if (!p) return;
      // Display name is locked at first seat (anti spoof via JOIN_GAME).
      if (profile.avatar) p.avatar = profile.avatar;
      p.disconnected = false;
    },
  };
}
