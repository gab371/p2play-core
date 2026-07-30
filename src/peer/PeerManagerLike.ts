import type { ChatMessage, LobbyPlayer, NetworkMessage, PeerChatProfile } from "./types";

/**
 * Shared contract for standalone PeerManager and HubPeerManager handover.
 */
export interface PeerManagerLike<TState = unknown> {
  isHost: boolean;
  myPeerId: string | null;
  hostPeerId: string | null;
  /** Present on the Hub; optional in standalone. */
  lobbyPlayers?: LobbyPlayer[];
  /** Per-peer data connections (host engines send personalized STATE_UPDATE). */
  connections: Map<string, { open: boolean; send: (data: unknown) => void; peer: string }>;

  onStateReceived: ((state: TState) => void) | null;
  onChatReceived: ((msg: ChatMessage) => void) | null;
  onAudioReceived: ((sfx: string, intensity?: number) => void) | null;
  onPeerStatusChange: ((peerId: string, status: "CONNECTED" | "DISCONNECTED") => void) | null;
  hostActionHandler: ((peerId: string, actionMsg: NetworkMessage) => void) | null;
  /** Non-core message types received on the client (e.g. SHOT_FRAME). */
  onCustomMessage?: ((msg: NetworkMessage) => void) | null;
  /** Voice signaling callback. */
  onVoiceMessage?: ((msg: NetworkMessage) => void) | null;

  getPeer?(): any;

  /** Bind a display name to a peer id (host uses this to sanitize CHAT). */
  registerPeerProfile?(peerId: string, profile: PeerChatProfile): void;

  sendToHost(type: string, payload: Record<string, unknown>): void;
  broadcast(message: NetworkMessage, excludePeerId?: string): void;
  sendChat(senderName: string, text: string): void;
  sendAudio(sfx: string, intensity?: number): void;
  disconnect(): void;

  startHeartbeat?(): void;
  stopHeartbeat?(): void;

  initHost?(customRoomId?: string | null): Promise<string>;
  initClient?(hostRoomId: string): Promise<string>;
}
