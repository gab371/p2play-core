export interface P2PlaySession {
  previousPeerId: string;
  username: string;
  avatar: string;
  role: "player" | "spectator";
  sessionToken: string;
  savedAt: number;
}

/** Durable browser identity (multi-day) — not cleared when leaving a room. */
export interface P2PlayProfile {
  username: string;
  avatar: string;
  updatedAt: number;
}

export interface RequestReconnectPayload {
  previousPeerId: string;
  username: string;
  sessionToken: string;
}

export interface ReconnectAcceptedPayload {
  peerId: string;
  previousPeerId: string;
}

export interface ReconnectRejectedPayload {
  reason: "grace_expired" | "unknown_session" | "token_mismatch";
}

export interface RequestReconnectMessage {
  type: "REQUEST_RECONNECT";
  payload: RequestReconnectPayload;
  sender: string;
}

export interface ReconnectAcceptedMessage {
  type: "RECONNECT_ACCEPTED";
  payload: ReconnectAcceptedPayload;
}

export interface ReconnectRejectedMessage {
  type: "RECONNECT_REJECTED";
  payload: ReconnectRejectedPayload;
}
