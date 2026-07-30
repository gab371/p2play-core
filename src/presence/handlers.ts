import type { GraceRegistry } from "./graceRegistry";
import type {
  GameSeatEngine,
  JoinSeatResult,
  ReconnectHandleResult,
  SeatProfile,
} from "./types";

export function handleDisconnect(opts: {
  engine: GameSeatEngine;
  peerId: string;
  grace: GraceRegistry;
  graceMs: number;
  onBroadcast: () => void;
}): void {
  const { engine, peerId, grace, graceMs, onBroadcast } = opts;
  const isSpectator = engine.isSpectator?.(peerId) ?? false;

  if (engine.isLobbyPhase() || isSpectator) {
    grace.cancel(peerId);
    engine.removePlayer(peerId);
    onBroadcast();
    return;
  }

  engine.markDisconnected(peerId);
  grace.schedule(
    peerId,
    () => {
      engine.removePlayer(peerId);
      onBroadcast();
    },
    graceMs,
  );
  onBroadcast();
}

export function handleRequestReconnect(opts: {
  engine: GameSeatEngine;
  senderPeerId: string;
  previousPeerId: string;
  sessionToken?: string;
  profile?: SeatProfile;
  grace: GraceRegistry;
  /** Verify sessionToken for previousPeerId; reject on mismatch. */
  verifySessionToken?: (previousPeerId: string, token: string | undefined) => boolean;
  onSessionTransfer?: (previousPeerId: string, senderPeerId: string) => void;
  send: (msg: Record<string, unknown>) => void;
  onBroadcast: () => void;
  onSeatRemapped?: (oldId: string, newId: string) => void;
}): ReconnectHandleResult {
  const {
    engine,
    senderPeerId,
    previousPeerId,
    sessionToken,
    profile,
    grace,
    verifySessionToken,
    onSessionTransfer,
    send,
    onBroadcast,
    onSeatRemapped,
  } = opts;

  if (!engine.isDisconnected(previousPeerId)) {
    send({
      type: "RECONNECT_REJECTED",
      payload: { reason: "grace_expired" },
    });
    return "rejected";
  }

  if (verifySessionToken && !verifySessionToken(previousPeerId, sessionToken)) {
    send({
      type: "RECONNECT_REJECTED",
      payload: { reason: "token_mismatch" },
    });
    return "rejected";
  }

  grace.cancel(previousPeerId);
  const ok = engine.remapPlayerId(previousPeerId, senderPeerId, profile);
  if (!ok) {
    send({
      type: "RECONNECT_REJECTED",
      payload: { reason: "unknown_session" },
    });
    return "rejected";
  }

  onSessionTransfer?.(previousPeerId, senderPeerId);
  send({
    type: "RECONNECT_ACCEPTED",
    payload: { peerId: senderPeerId, previousPeerId },
  });
  onSeatRemapped?.(previousPeerId, senderPeerId);
  onBroadcast();
  return "accepted";
}

export function handleJoinGameSeat(opts: {
  engine: GameSeatEngine;
  playerId: string;
  payload: { name?: string; avatar?: string };
  isHostPlayer?: boolean;
  addPlayer: (id: string, name: string, avatar: string, isHost: boolean) => void;
  /** When omitted, non-lobby join falls back to addPlayer (e.g. billard). */
  addSpectator?: (id: string, name: string, avatar: string) => void;
}): JoinSeatResult {
  const { engine, playerId, payload, isHostPlayer, addPlayer, addSpectator } = opts;
  const name = payload.name || "Joueur";
  const avatar = payload.avatar || "👤";

  if (engine.findSeatedPlayer) {
    const existing = engine.findSeatedPlayer(playerId);
    if (existing) {
      engine.refreshSeatedIdentity?.(playerId, {
        name: payload.name,
        avatar: payload.avatar,
      });
      return "refreshed";
    }
  }

  if (engine.isLobbyPhase() || !addSpectator) {
    addPlayer(playerId, name, avatar, !!isHostPlayer);
    return "joined_player";
  }

  addSpectator(playerId, name, avatar);
  return "joined_spectator";
}
