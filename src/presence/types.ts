export interface SeatProfile {
  username?: string;
  avatar?: string;
}

export interface SeatedPlayerView {
  name?: string;
  avatar?: string;
  disconnected?: boolean;
}

/**
 * Minimal seat contract — games adapt their engine behind this interface.
 * Business remap (bags, pending actions, …) stays inside remapPlayerId.
 */
export interface GameSeatEngine {
  isLobbyPhase(): boolean;
  isSpectator?(peerId: string): boolean;
  isDisconnected(peerId: string): boolean;
  markDisconnected(peerId: string): void;
  remapPlayerId(oldId: string, newId: string, profile?: SeatProfile): boolean;
  removePlayer(peerId: string): void;
  findSeatedPlayer?(peerId: string): SeatedPlayerView | null;
  refreshSeatedIdentity?(peerId: string, profile: { name?: string; avatar?: string }): void;
}

export type JoinSeatResult = "refreshed" | "joined_player" | "joined_spectator" | "ignored";

export type ReconnectHandleResult = "accepted" | "rejected";
