import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { PeerManagerLike } from "./PeerManagerLike";
import type { ChatMessage, LobbyPlayer, NetworkMessage } from "./types";

export interface PeerManagerOptions {
  /** PeerJS id prefix to avoid broker collisions (e.g. "royal", "skull", "pool"). */
  namespacePrefix: string;
  peerjsDebug?: 0 | 1 | 2 | 3;
}

export class PeerManager<TState = unknown> implements PeerManagerLike<TState> {
  public peer: Peer | null = null;
  public connections: Map<string, DataConnection> = new Map();
  public isHost = false;
  public myPeerId: string | null = null;
  public hostPeerId: string | null = null;
  public lobbyPlayers?: LobbyPlayer[];

  public onStateReceived: ((state: TState) => void) | null = null;
  public onChatReceived: ((msg: ChatMessage) => void) | null = null;
  public onAudioReceived: ((sfx: string, intensity?: number) => void) | null = null;
  public onPeerStatusChange: ((peerId: string, status: "CONNECTED" | "DISCONNECTED") => void) | null =
    null;
  public hostActionHandler: ((peerId: string, actionMsg: NetworkMessage) => void) | null = null;
  public onCustomMessage: ((msg: NetworkMessage) => void) | null = null;

  private readonly namespacePrefix: string;
  private readonly peerjsDebug: 0 | 1 | 2 | 3;

  constructor(options: PeerManagerOptions) {
    this.namespacePrefix = options.namespacePrefix;
    this.peerjsDebug = options.peerjsDebug ?? 1;
  }

  public generateRoomId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private namespaceId(id: string): string {
    const hostClean = window.location.host.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return `${this.namespacePrefix}_${hostClean}_${id}`;
  }

  public initHost(customRoomId: string | null = null): Promise<string> {
    return new Promise((resolve, reject) => {
      const roomId = customRoomId || this.generateRoomId();
      this.isHost = true;
      this.hostPeerId = roomId;

      const namespacedRoomId = this.namespaceId(roomId);
      this.peer = new Peer(namespacedRoomId, { debug: this.peerjsDebug });
      this.peer.on("open", () => {
        this.myPeerId = roomId;
        this.hostPeerId = roomId;
        resolve(roomId);
      });
      this.peer.on("connection", (conn) => this.handleHostIncomingConnection(conn));
      this.peer.on("error", (err) => reject(err));
    });
  }

  public initClient(hostRoomId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.hostPeerId = hostRoomId;

      this.peer = new Peer({ debug: this.peerjsDebug });
      this.peer.on("open", (id) => {
        this.myPeerId = id;
        if (!this.peer) return reject(new Error("Peer not initialized"));
        const namespacedHostId = this.namespaceId(hostRoomId);
        const conn = this.peer.connect(namespacedHostId, { reliable: true });
        conn.on("open", () => {
          this.connections.set(hostRoomId, conn);
          this.setupClientConnectionListeners(conn);
          resolve(id);
        });
        conn.on("error", (err) => reject(err));
      });
      this.peer.on("error", (err) => reject(err));
    });
  }

  private handleHostIncomingConnection(conn: DataConnection): void {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);
      this.onPeerStatusChange?.(conn.peer, "CONNECTED");
    });

    conn.on("data", (data: unknown) => {
      const msg = data as NetworkMessage;
      if (!msg?.type) return;
      if (msg.type === "CHAT") {
        this.broadcast(msg);
        this.onChatReceived?.(msg as ChatMessage);
      } else if (msg.type === "AUDIO_EVENT") {
        this.broadcast(msg);
        const audio = msg as { sfx?: string; intensity?: number };
        if (audio.sfx) this.onAudioReceived?.(audio.sfx, audio.intensity);
      } else {
        this.hostActionHandler?.(conn.peer, msg);
      }
    });

    conn.on("close", () => {
      this.connections.delete(conn.peer);
      this.onPeerStatusChange?.(conn.peer, "DISCONNECTED");
    });
  }

  private setupClientConnectionListeners(conn: DataConnection): void {
    conn.on("data", (data: unknown) => {
      const msg = data as NetworkMessage;
      if (!msg?.type) return;
      switch (msg.type) {
        case "STATE_UPDATE": {
          const stateMsg = msg as { state?: TState };
          if (stateMsg.state !== undefined) this.onStateReceived?.(stateMsg.state);
          break;
        }
        case "CHAT":
          this.onChatReceived?.(msg as ChatMessage);
          break;
        case "AUDIO_EVENT": {
          const audio = msg as { sfx?: string; intensity?: number };
          if (audio.sfx) this.onAudioReceived?.(audio.sfx, audio.intensity);
          break;
        }
        default:
          this.onCustomMessage?.(msg);
          break;
      }
    });
  }

  public sendToHost(type: string, payload: Record<string, unknown>): void {
    if (this.isHost) {
      if (this.hostActionHandler && this.myPeerId) {
        this.hostActionHandler(this.myPeerId, { type, ...payload });
      }
    } else if (this.hostPeerId) {
      const conn = this.connections.get(this.hostPeerId);
      if (conn?.open) conn.send({ type, ...payload });
    }
  }

  public broadcast(message: NetworkMessage, excludePeerId?: string): void {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) conn.send(message);
    });
  }

  public sendAudio(sfx: string, intensity?: number): void {
    const audioMsg: NetworkMessage = {
      type: "AUDIO_EVENT",
      sfx,
      ...(intensity !== undefined ? { intensity } : {}),
    };
    if (this.isHost) {
      this.broadcast(audioMsg);
      this.onAudioReceived?.(sfx, intensity);
    } else if (this.hostPeerId) {
      const conn = this.connections.get(this.hostPeerId);
      if (conn?.open) conn.send(audioMsg);
    }
  }

  public sendChat(senderName: string, text: string): void {
    const chatMsg: ChatMessage = {
      type: "CHAT",
      sender: senderName,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    if (this.isHost) {
      this.broadcast(chatMsg);
      this.onChatReceived?.(chatMsg);
    } else if (this.hostPeerId) {
      const conn = this.connections.get(this.hostPeerId);
      if (conn?.open) conn.send(chatMsg);
    }
  }

  public disconnect(): void {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = null;
    this.hostPeerId = null;
    this.isHost = false;
  }
}
