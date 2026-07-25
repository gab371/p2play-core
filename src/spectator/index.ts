export type {
  ParticipantRole,
  SpectatorConfig,
  SanitizeForViewer,
} from "./types";
export { EMPTY_SPECTATOR_CONFIG } from "./types";
export {
  isSpectator,
  isLocked,
  canChangeRole,
  applySetRole,
  setSpectatorLock,
  assignLateJoinerAsSpectator,
  spectatorConfigFromIds,
} from "./helpers";
export type {
  SpectatorMessageType,
  SetRoleMessage,
  SetSpectatorLockMessage,
  SyncSpectatorConfigMessage,
  SpectatorNetworkMessage,
} from "./messages";
export { useSpectatorRole } from "./useSpectatorRole";
