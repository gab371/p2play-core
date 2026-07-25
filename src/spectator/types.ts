export type ParticipantRole = "player" | "spectator";

export interface SpectatorConfig {
  /** peerIds currently marked as spectators */
  spectators: string[];
  /** peerId → locked by host (cannot self-promote to player) */
  spectatorLocks: Record<string, boolean>;
}

export const EMPTY_SPECTATOR_CONFIG: SpectatorConfig = {
  spectators: [],
  spectatorLocks: {},
};

/** Contract games implement for fog-of-war before STATE_UPDATE. */
export type SanitizeForViewer<TState> = (
  state: TState,
  viewerId: string,
  role: ParticipantRole,
) => TState;
