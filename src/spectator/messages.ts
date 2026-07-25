import type { ParticipantRole, SpectatorConfig } from "./types";

export type SpectatorMessageType = "SET_ROLE" | "SET_SPECTATOR_LOCK" | "SYNC_SPECTATOR_CONFIG";

export interface SetRoleMessage {
  type: "SET_ROLE";
  payload: { peerId: string; role: ParticipantRole };
}

export interface SetSpectatorLockMessage {
  type: "SET_SPECTATOR_LOCK";
  payload: { peerId: string; locked: boolean };
}

export interface SyncSpectatorConfigMessage {
  type: "SYNC_SPECTATOR_CONFIG";
  payload: SpectatorConfig;
}

export type SpectatorNetworkMessage =
  | SetRoleMessage
  | SetSpectatorLockMessage
  | SyncSpectatorConfigMessage;
