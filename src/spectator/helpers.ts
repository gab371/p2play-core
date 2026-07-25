import type { ParticipantRole, SpectatorConfig } from "./types";

export function isSpectator(peerId: string, config: SpectatorConfig): boolean {
  return config.spectators.includes(peerId);
}

export function isLocked(peerId: string, config: SpectatorConfig): boolean {
  return !!config.spectatorLocks[peerId];
}

/**
 * Role changes:
 * - Anyone may change their own role (unless locked when promoting to player).
 * - Host may force others to spectator only — never force player mode.
 * - Locked peers cannot become players until the host unlocks them.
 */
export function canChangeRole(
  peerId: string,
  config: SpectatorConfig,
  opts: { requesterPeerId: string; requesterIsHost: boolean; nextRole: ParticipantRole },
): boolean {
  if (opts.nextRole === "player" && isLocked(peerId, config)) return false;

  const isSelf = opts.requesterPeerId === peerId;
  if (isSelf) return true;

  // Host authority is one-way: eject unwanted players into spectator mode.
  return opts.requesterIsHost && opts.nextRole === "spectator";
}

export function applySetRole(
  config: SpectatorConfig,
  peerId: string,
  role: ParticipantRole,
): SpectatorConfig {
  const spectators = new Set(config.spectators);
  if (role === "spectator") spectators.add(peerId);
  else spectators.delete(peerId);
  return {
    spectators: [...spectators],
    spectatorLocks: { ...config.spectatorLocks },
  };
}

export function setSpectatorLock(
  config: SpectatorConfig,
  peerId: string,
  locked: boolean,
): SpectatorConfig {
  return {
    spectators: [...config.spectators],
    spectatorLocks: { ...config.spectatorLocks, [peerId]: locked },
  };
}

/** Running game: late joiner becomes a spectator. */
export function assignLateJoinerAsSpectator(
  config: SpectatorConfig,
  peerId: string,
): SpectatorConfig {
  return applySetRole(config, peerId, "spectator");
}

export function spectatorConfigFromIds(
  spectatorIds: string[],
  locks: Record<string, boolean> = {},
): SpectatorConfig {
  return {
    spectators: [...spectatorIds],
    spectatorLocks: { ...locks },
  };
}
