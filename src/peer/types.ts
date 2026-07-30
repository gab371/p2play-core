export type CoreMessageType =
  | "STATE_UPDATE"
  | "CHAT"
  | "AUDIO_EVENT"
  | "VOICE_STATE_UPDATE"
  | "VOICE_MODERATION_ACTION"
  | "PING"
  | "PONG";

export interface PingMessage {
  type: "PING";
  ts: number;
}

export interface PongMessage {
  type: "PONG";
  ts: number;
}

export interface ChatMessage {
  type: "CHAT";
  sender: string;
  text: string;
  time: string;
  /** Set by the host from the DataConnection peer id (not client-spoofable). */
  senderPeerId?: string;
}

export interface PeerChatProfile {
  username: string;
  avatar?: string;
}

export interface AudioEventMessage {
  type: "AUDIO_EVENT";
  sfx: string;
  intensity?: number;
}

export interface StateUpdateMessage<TState = unknown> {
  type: "STATE_UPDATE";
  state: TState;
}

export interface VoiceParticipantState {
  peerId: string;
  username?: string;
  avatar?: string;
  selfMuted: boolean;
  deafened: boolean;
  serverMuted: boolean;
  lockMuted: boolean;
  isSpeaking: boolean;
}

export interface VoiceStateUpdateMessage {
  type: "VOICE_STATE_UPDATE";
  sender: string;
  voiceState: VoiceParticipantState;
}

export interface VoiceModerationActionMessage {
  type: "VOICE_MODERATION_ACTION";
  targetPeerId: string;
  action: "SERVER_MUTE" | "SERVER_UNMUTE" | "LOCK_MUTE" | "LOCK_UNMUTE";
}

/** Generic envelope; game-specific ActionTypes stay in each game. */
export type NetworkMessage =
  | ChatMessage
  | AudioEventMessage
  | StateUpdateMessage<unknown>
  | VoiceStateUpdateMessage
  | VoiceModerationActionMessage
  | PingMessage
  | PongMessage
  | { type: string; [key: string]: unknown };

export interface LobbyPlayer {
  peerId: string;
  username: string;
  avatar: string;
}

