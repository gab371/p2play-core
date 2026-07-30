import { Peer } from "peerjs";
import type { DataConnection } from "peerjs";
import type { PeerManagerLike } from "./PeerManagerLike";
import type {
  ChatMessage,
  LobbyPlayer,
  NetworkMessage,
  PeerChatProfile,
  PingMessage,
  PongMessage,
} from "./types";

export interface PeerManagerOptions {
  /** PeerJS id prefix to avoid broker collisions (e.g. "royal", "skull", "pool"). */
  namespacePrefix: string;
  peerjsDebug?: 0 | 1 | 2 | 3;
}

const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export class PeerManager<TState = unknown> implements PeerManagerLike<TState> {
  public peer: Peer | null = null;
  public connections: Map<string, DataConnection> = new Map();
  public isHost = false;
  public myPeerId: string | null = null;
  public hostPeerId: string | null = null;
  public lobbyPlayers?: LobbyPlayer[];
  /** Authoritative chat display names keyed by peer id (host-sanitized CHAT). */
  public peerProfiles: Map<string, PeerChatProfile> = new Map();

  public onStateReceived: ((state: TState) => void) | null = null;
  public onChatReceived: ((msg: ChatMessage) => void) | null = null;
  public onAudioReceived: ((sfx: string, intensity?: number) => void) | null = null;
  public onPeerStatusChange: ((peerId: string, status: "CONNECTED" | "DISCONNECTED") => void) | null =
    null;
  public hostActionHandler: ((peerId: string, actionMsg: NetworkMessage) => void) | null = null;
  public onCustomMessage: ((msg: NetworkMessage) => void) | null = null;
  public onVoiceMessage: ((msg: NetworkMessage) => void) | null = null;

  private readonly namespacePrefix: string;
  private readonly peerjsDebug: 0 | 1 | 2 | 3;

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongReceived: Map<string, number> = new Map();
  private static readonly HEARTBEAT_MS = 5_000;
  private static readonly HEARTBEAT_TIMEOUT_MS = 12_000;

  constructor(options: PeerManagerOptions) {
    this.namespacePrefix = options.namespacePrefix;
    this.peerjsDebug = options.peerjsDebug ?? 1;
  }

  public getPeer(): Peer | null {
    return this.peer;
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

  /**
   * Map key for a live DataConnection. Clients store the host link under
   * `hostRoomId` (short code), while `conn.peer` is the namespaced PeerJS id —
   * heartbeat / close must use the map key, not `conn.peer`.
   */
  private keyForConnection(conn: DataConnection): string | null {
    for (const [key, c] of this.connections) {
      if (c === conn) return key;
    }
    return null;
  }

  private dropConnection(conn: DataConnection): void {
    const key = this.keyForConnection(conn);
    if (key === null) return;
    this.connections.delete(key);
    this.lastPongReceived.delete(key);
    this.onPeerStatusChange?.(key, "DISCONNECTED");
  }

  public initHost(customRoomId: string | null = null): Promise<string> {
    return new Promise((resolve, reject) => {
      const roomId = customRoomId || this.generateRoomId();
      this.isHost = true;
      this.hostPeerId = roomId;

      const namespacedRoomId = this.namespaceId(roomId);
      this.peer = new Peer(namespacedRoomId, { debug: this.peerjsDebug, config: DEFAULT_RTC_CONFIG });
      this.peer.on("open", () => {
        this.myPeerId = roomId;
        this.hostPeerId = roomId;
        this.startHeartbeat();
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

      this.peer = new Peer({ debug: this.peerjsDebug, config: DEFAULT_RTC_CONFIG });
      this.peer.on("open", (id) => {
        this.myPeerId = id;
        if (!this.peer) return reject(new Error("Peer not initialized"));
        const namespacedHostId = this.namespaceId(hostRoomId);
        const conn = this.peer.connect(namespacedHostId, { reliable: true });
        conn.on("open", () => {
          this.connections.set(hostRoomId, conn);
          this.lastPongReceived.set(hostRoomId, Date.now());
          this.setupClientConnectionListeners(conn);
          this.startHeartbeat();
          resolve(id);
        });
        conn.on("error", (err) => reject(err));
      });
      this.peer.on("connection", (conn) => this.handleClientIncomingConnection(conn));
      this.peer.on("error", (err) => reject(err));
    });
  }

  private handleClientIncomingConnection(conn: DataConnection): void {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);
      this.lastPongReceived.set(conn.peer, Date.now());
      this.onPeerStatusChange?.(conn.peer, "CONNECTED");
    });
    this.setupClientConnectionListeners(conn);
  }

  private handleHostIncomingConnection(conn: DataConnection): void {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);
      this.lastPongReceived.set(conn.peer, Date.now());
      this.onPeerStatusChange?.(conn.peer, "CONNECTED");
    });

    conn.on("data", (data: unknown) => {
      const msg = data as NetworkMessage;
      if (!msg?.type) return;
      if (msg.type === "PING") { this.handlePing(conn); return; }
      if (msg.type === "PONG") {
        const key = this.keyForConnection(conn) ?? conn.peer;
        this.handlePong(key);
        return;
      }
      if (msg.type === "CHAT") {
        const incoming = msg as ChatMessage;
        const safe = this.sanitizeChatMessage(conn.peer, incoming);
        this.broadcast(safe, conn.peer);
        this.onChatReceived?.(safe);
      } else if (msg.type === "AUDIO_EVENT") {
        this.broadcast(msg);
        const audio = msg as { sfx?: string; intensity?: number };
        if (audio.sfx) this.onAudioReceived?.(audio.sfx, audio.intensity);
      } else if (msg.type === "VOICE_STATE_UPDATE") {
        const safe = this.sanitizeVoiceStateUpdate(conn.peer, msg);
        this.broadcast(safe, conn.peer);
        this.onVoiceMessage?.(safe);
      } else if (msg.type === "VOICE_MODERATION_ACTION") {
        // Only the room host may moderate — drop guest injections.
        return;
      } else {
        this.hostActionHandler?.(conn.peer, msg);
      }
    });

    conn.on("close", () => this.dropConnection(conn));
    conn.on("error", () => this.dropConnection(conn));
  }

  private setupClientConnectionListeners(conn: DataConnection): void {
    conn.on("data", (data: unknown) => {
      const msg = data as NetworkMessage;
      if (!msg?.type) return;
      if (msg.type === "PING") { this.handlePing(conn); return; }
      if (msg.type === "PONG") {
        const key = this.keyForConnection(conn) ?? conn.peer;
        this.handlePong(key);
        return;
      }
      // Authoritative room messages only from the host (ignore mesh peer spoofing).
      const fromHost = conn.peer === this.hostPeerId;
      if (!fromHost) return;

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
        case "VOICE_STATE_UPDATE": {
          this.onVoiceMessage?.(msg);
          const update = msg as { voiceState?: { peerId?: string } };
          const peerId = update.voiceState?.peerId;
          if (!this.isHost && peerId && peerId !== this.myPeerId && !this.connections.has(peerId)) {
            const peerConn = this.peer?.connect(peerId, { reliable: true });
            if (peerConn) {
              this.handleClientIncomingConnection(peerConn);
            }
          }
          break;
        }
        case "VOICE_MODERATION_ACTION":
          this.onVoiceMessage?.(msg);
          break;
        default:
          this.onCustomMessage?.(msg);
          break;
      }
    });
    conn.on("close", () => this.dropConnection(conn));
    conn.on("error", () => this.dropConnection(conn));
  }

  public sendToHost(type: string, payload: Record<string, unknown>): void {
    if (this.isHost) {
      if (this.hostActionHandler && this.myPeerId) {
        this.hostActionHandler(this.myPeerId, { type, ...payload });
      }
      return;
    }
    if (!this.hostPeerId) return;
    const conn = this.connections.get(this.hostPeerId);
    if (conn?.open) {
      conn.send({ type, ...payload });
      return;
    }
    // Connection not ready yet — retry briefly (common right after initClient / hub embed).
    const started = Date.now();
    const trySend = () => {
      const c = this.hostPeerId ? this.connections.get(this.hostPeerId) : undefined;
      if (c?.open) {
        c.send({ type, ...payload });
        return;
      }
      if (Date.now() - started < 5000) {
        window.setTimeout(trySend, 100);
      } else {
        console.warn("[p2play-core] sendToHost: no open connection to host", this.hostPeerId, type);
      }
    };
    window.setTimeout(trySend, 50);
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

  public registerPeerProfile(peerId: string, profile: PeerChatProfile): void {
    if (!peerId || !profile?.username) return;
    this.peerProfiles.set(peerId, {
      username: profile.username,
      avatar: profile.avatar,
    });
  }

  /** Resolve display name from lobby / profiles — never trust a client CHAT.sender. */
  public resolveChatSender(peerId: string | null | undefined): string {
    if (!peerId) return "Joueur";
    const lobby = this.lobbyPlayers?.find(
      (p) => p.peerId === peerId || peerId.endsWith(p.peerId) || p.peerId.endsWith(peerId),
    );
    if (lobby?.username) return lobby.username;
    const direct = this.peerProfiles.get(peerId);
    if (direct?.username) return direct.username;
    for (const [id, profile] of this.peerProfiles) {
      if (peerId.endsWith(id) || id.endsWith(peerId)) return profile.username;
    }
    return `Joueur-${peerId.slice(0, 4)}`;
  }

  private sanitizeChatMessage(peerId: string, incoming: ChatMessage): ChatMessage {
    return {
      type: "CHAT",
      sender: this.resolveChatSender(peerId),
      text: typeof incoming.text === "string" ? incoming.text : "",
      time:
        typeof incoming.time === "string" && incoming.time
          ? incoming.time
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      senderPeerId: peerId,
    };
  }

  private sanitizeVoiceStateUpdate(peerId: string, msg: NetworkMessage): NetworkMessage {
    const raw = msg as {
      voiceState?: Record<string, unknown>;
    };
    const prev = raw.voiceState && typeof raw.voiceState === "object" ? raw.voiceState : {};
    return {
      type: "VOICE_STATE_UPDATE",
      sender: peerId,
      voiceState: {
        ...prev,
        peerId,
        username: this.resolveChatSender(peerId),
      },
    };
  }

  public sendChat(senderName: string, text: string): void {
    // Bind own display name on first send if not already known (never used for other peers).
    if (
      this.myPeerId &&
      senderName &&
      !this.lobbyPlayers?.some((p) => p.peerId === this.myPeerId) &&
      !this.peerProfiles.has(this.myPeerId)
    ) {
      this.registerPeerProfile(this.myPeerId, { username: senderName });
    }
    const chatMsg: ChatMessage = {
      type: "CHAT",
      sender: this.resolveChatSender(this.myPeerId),
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      senderPeerId: this.myPeerId ?? undefined,
    };

    this.onChatReceived?.(chatMsg);
    if (this.isHost) {
      this.broadcast(chatMsg);
    } else if (this.hostPeerId) {
      const conn = this.connections.get(this.hostPeerId);
      if (conn?.open) conn.send(chatMsg);
    }
  }

  public startHeartbeat(): void {
    this.stopHeartbeat();
    const now = Date.now();
    this.connections.forEach((_conn, peerId) => this.lastPongReceived.set(peerId, now));

    this.heartbeatInterval = setInterval(() => {
      const ping: PingMessage = { type: "PING", ts: Date.now() };
      const deadline = Date.now() - PeerManager.HEARTBEAT_TIMEOUT_MS;
      const timedOut: string[] = [];

      this.connections.forEach((conn, peerId) => {
        if (conn.open) conn.send(ping);
        const lastSeen = this.lastPongReceived.get(peerId) ?? 0;
        if (lastSeen < deadline) timedOut.push(peerId);
      });

      for (const peerId of timedOut) {
        console.warn(`[p2play-core] heartbeat timeout for ${peerId}`);
        const conn = this.connections.get(peerId);
        this.connections.delete(peerId);
        this.lastPongReceived.delete(peerId);
        this.onPeerStatusChange?.(peerId, "DISCONNECTED");
        try { conn?.close(); } catch { /* already dead */ }
      }
    }, PeerManager.HEARTBEAT_MS);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.lastPongReceived.clear();
  }

  private handlePing(conn: DataConnection): void {
    if (conn.open) {
      const pong: PongMessage = { type: "PONG", ts: Date.now() };
      conn.send(pong);
    }
  }

  private handlePong(peerId: string): void {
    this.lastPongReceived.set(peerId, Date.now());
  }

  public disconnect(): void {
    this.stopHeartbeat();
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
