export type CoreMessageType = "STATE_UPDATE" | "CHAT" | "AUDIO_EVENT";

export interface ChatMessage {
  type: "CHAT";
  sender: string;
  text: string;
  time: string;
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

/** Generic envelope; game-specific ActionTypes stay in each game. */
export type NetworkMessage =
  | ChatMessage
  | AudioEventMessage
  | StateUpdateMessage<unknown>
  | { type: string; [key: string]: unknown };

export interface LobbyPlayer {
  peerId: string;
  username: string;
  avatar: string;
}
