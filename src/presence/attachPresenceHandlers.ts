import { DEFAULT_PRESENCE_GRACE_MS, GraceRegistry } from "./graceRegistry";
import {
  handleDisconnect,
  handleJoinGameSeat,
  handleRequestReconnect,
} from "./handlers";
import { SessionTokenRegistry } from "./sessionTokens";
import type { GameSeatEngine, JoinSeatResult, SeatProfile } from "./types";

/** Minimal PeerManager surface used by presence (avoids circular imports). */
export interface PresencePeerManager {
  connections: Map<string, { open: boolean; send: (data: unknown) => void }>;
  onPeerStatusChange:
    | ((peerId: string, status: "CONNECTED" | "DISCONNECTED") => void)
    | null;
  hostActionHandler:
    | ((senderPeerId: string, msg: any) => void)
    | null;
}

export interface AttachPresenceOptions {
  peerManager: PresencePeerManager;
  getEngine: () => GameSeatEngine;
  graceMs?: number;
  onBroadcast: () => void;
  onSeatRemapped?: (oldId: string, newId: string) => void;
  /**
   * Game ACTION / other host messages after REQUEST_RECONNECT is handled.
   * JOIN_GAME can be delegated via `joinGame` helpers from the returned API,
   * or handled entirely inside this callback.
   */
  onHostAction?: (senderPeerId: string, msg: Record<string, unknown>) => void;
}

export interface PresenceController {
  /** Dispose timers and restore previous PeerManager callbacks. */
  dispose: () => void;
  /** Shared JOIN_GAME seat logic (lobby / spectator / refresh). */
  joinGameSeat: (opts: {
    playerId: string;
    payload: { name?: string; avatar?: string };
    isHostPlayer?: boolean;
    addPlayer: (id: string, name: string, avatar: string, isHost: boolean) => void;
    addSpectator?: (id: string, name: string, avatar: string) => void;
  }) => JoinSeatResult;
}

/**
 * Wires DISCONNECTED grace + REQUEST_RECONNECT on PeerManager.
 * Chains existing onPeerStatusChange (e.g. voice) so it is not overwritten.
 */
export function attachPresenceHandlers(opts: AttachPresenceOptions): PresenceController {
  const {
    peerManager,
    getEngine,
    graceMs = DEFAULT_PRESENCE_GRACE_MS,
    onBroadcast,
    onSeatRemapped,
    onHostAction,
  } = opts;

  const grace = new GraceRegistry();
  const sessionTokens = new SessionTokenRegistry();
  const prevStatus = peerManager.onPeerStatusChange;
  const prevHost = peerManager.hostActionHandler;

  peerManager.onPeerStatusChange = (peerId, status) => {
    prevStatus?.(peerId, status);
    if (status === "DISCONNECTED") {
      handleDisconnect({
        engine: getEngine(),
        peerId,
        grace,
        graceMs,
        onBroadcast,
      });
    } else if (status === "CONNECTED") {
      onBroadcast();
    }
  };

  peerManager.hostActionHandler = (senderPeerId, msg) => {
    if (msg.type === "REGISTER_SESSION") {
      const token = typeof msg.sessionToken === "string" ? msg.sessionToken : "";
      sessionTokens.register(senderPeerId, token);
      return;
    }
    if (msg.type === "REQUEST_RECONNECT") {
      const previousPeerId = String(msg.previousPeerId ?? "");
      const sessionToken =
        typeof msg.sessionToken === "string" ? msg.sessionToken : undefined;
      const profile: SeatProfile = {
        username: typeof msg.username === "string" ? msg.username : undefined,
        avatar: typeof msg.avatar === "string" ? msg.avatar : undefined,
      };
      handleRequestReconnect({
        engine: getEngine(),
        senderPeerId,
        previousPeerId,
        sessionToken,
        profile,
        grace,
        verifySessionToken: (prevId, token) => sessionTokens.verify(prevId, token),
        onSessionTransfer: (prevId, nextId) => {
          sessionTokens.transfer(prevId, nextId);
        },
        send: (m) => {
          const conn = peerManager.connections.get(senderPeerId);
          if (conn?.open) conn.send(m);
        },
        onBroadcast,
        onSeatRemapped,
      });
      return;
    }
    onHostAction?.(senderPeerId, msg);
  };

  return {
    dispose: () => {
      grace.clearAll();
      peerManager.onPeerStatusChange = prevStatus;
      peerManager.hostActionHandler = prevHost;
    },
    joinGameSeat: (joinOpts) =>
      handleJoinGameSeat({
        engine: getEngine(),
        ...joinOpts,
      }),
  };
}
