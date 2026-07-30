import { useCallback, useEffect, useRef, useState } from "react";
import { PeerManager } from "../peer/PeerManager";
import type { PeerManagerLike } from "../peer/PeerManagerLike";
import type { ChatMessage, NetworkMessage } from "../peer/types";
import { clearRoomUrlFromAddressBar, subscribeForeignRoomReload, syncRoomUrlToAddressBar } from "../url";
import { saveSession, clearSession, loadSession, createSessionToken } from "../session/helpers";

export type PeerStatus = "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED";

export interface PeerProfile {
  username: string;
  avatar: string;
}

export interface UsePeerOptions<TState = unknown> {
  externalPeerManager?: PeerManagerLike<TState>;
  /** Required when not using externalPeerManager. */
  namespacePrefix?: string;
  /** Map of remote sfx name → local play callback. */
  sounds?: Record<string, (intensity?: number) => void>;
  /** Optional handler for non-core client messages (e.g. SHOT_FRAME). */
  onCustomMessage?: (msg: NetworkMessage) => void;
  /** Player name for session persistence. */
  playerName?: string;
  /** Player avatar for session persistence. */
  playerAvatar?: string;
}

export function usePeer<TState = unknown>(options?: UsePeerOptions<TState>) {
  const peerManagerRef = useRef<PeerManagerLike<TState> | null>(null);
  const ext = options?.externalPeerManager;
  const soundsRef = useRef(options?.sounds);
  soundsRef.current = options?.sounds;
  const onCustomMessageRef = useRef(options?.onCustomMessage);
  onCustomMessageRef.current = options?.onCustomMessage;

  const [myPeerId, setMyPeerId] = useState<string | null>(ext?.myPeerId || null);
  const [hostPeerId, setHostPeerId] = useState<string | null>(
    ext?.hostPeerId || (ext as { roomId?: string } | undefined)?.roomId || null,
  );
  const [isHost, setIsHost] = useState<boolean>(ext?.isHost || false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const seedChat = (): ChatMessage[] => {
    const hist = (ext as { chatHistory?: ChatMessage[] } | undefined)?.chatHistory;
    return Array.isArray(hist) ? [...hist] : [];
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(seedChat);
  const [gameState, setGameState] = useState<TState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PeerStatus>(ext ? "CONNECTED" : "IDLE");
  const [customMessages, setCustomMessages] = useState<NetworkMessage[]>([]);

  if (!peerManagerRef.current) {
    if (ext) {
      peerManagerRef.current = ext;
    } else {
      const prefix = options?.namespacePrefix;
      if (!prefix) {
        throw new Error("usePeer: namespacePrefix is required when externalPeerManager is absent");
      }
      peerManagerRef.current = new PeerManager<TState>({ namespacePrefix: prefix });
    }
  }

  const peerManager = peerManagerRef.current;

  useEffect(() => {
    if (status !== "CONNECTED" && status !== "CONNECTING") return;
    return subscribeForeignRoomReload(() => hostPeerId);
  }, [status, hostPeerId]);

  useEffect(() => {
    // Hub-scoped history: re-seed when mounting over an external peer manager.
    const hist = (peerManager as { chatHistory?: ChatMessage[] }).chatHistory;
    if (Array.isArray(hist)) {
      setChatMessages([...hist]);
    }

    peerManager.onStateReceived = (state: TState) => {
      setGameState(state);
    };

    // Chain previous listener (e.g. Hub useHub) so salon chat stays live during a game.
    const previousChatHandler = peerManager.onChatReceived;
    peerManager.onChatReceived = (msg: ChatMessage) => {
      previousChatHandler?.(msg);
      setChatMessages((prev) => [...prev, msg]);
      soundsRef.current?.ping?.();
    };

    peerManager.onAudioReceived = (sfx: string, intensity?: number) => {
      const play = soundsRef.current?.[sfx];
      if (play) play(intensity);
    };

    peerManager.onPeerStatusChange = (peerId: string, peerStatus: "CONNECTED" | "DISCONNECTED") => {
      if (peerStatus === "CONNECTED") {
        setConnectedPeers((prev) => [...new Set([...prev, peerId])]);
      } else {
        setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
      }
    };

    const previousCustomHandler = peerManager.onCustomMessage ?? null;
    peerManager.onCustomMessage = (msg: NetworkMessage) => {
      if (msg.type === "RECONNECT_ACCEPTED") {
        const { peerId: newId } = (msg as unknown as { payload: { peerId: string; previousPeerId: string } }).payload;
        const room = peerManager.hostPeerId;
        if (room) {
          saveSession(room, {
            previousPeerId: newId,
            username: options?.playerName || "Joueur",
            avatar: options?.playerAvatar || "👤",
            role: "player",
            sessionToken: sessionTokenRef.current,
          });
        }
      }
      previousCustomHandler?.(msg);
      setCustomMessages((prev) => [...prev.slice(-20), msg]);
      onCustomMessageRef.current?.(msg);
    };

    return () => {
      peerManager.onStateReceived = null;
      peerManager.onChatReceived = previousChatHandler;
      peerManager.onAudioReceived = null;
      peerManager.onPeerStatusChange = null;
      if (peerManager.onCustomMessage !== undefined) {
        peerManager.onCustomMessage = previousCustomHandler;
      }
    };
  }, [peerManager]);

  const sessionTokenRef = useRef<string>(createSessionToken());

  const hostGame = useCallback(
    async (customRoomId?: string | null, profile?: PeerProfile): Promise<string> => {
      if (!peerManager.initHost) throw new Error("initHost not available on this peer manager");
      setStatus("CONNECTING");
      try {
        const id = await peerManager.initHost(customRoomId ?? null);
        setMyPeerId(id);
        setHostPeerId(id);
        setIsHost(true);
        setStatus("CONNECTED");
        setError(null);
        syncRoomUrlToAddressBar(id);
        const username = profile?.username || options?.playerName || "Host";
        const avatar = profile?.avatar || options?.playerAvatar || "👑";
        saveSession(id, {
          previousPeerId: id,
          username,
          avatar,
          role: "player",
          sessionToken: sessionTokenRef.current,
        });
        peerManager.sendToHost("REGISTER_SESSION", {
          sessionToken: sessionTokenRef.current,
        });
        return id;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Impossible de créer le salon.";
        setError(message);
        setStatus("DISCONNECTED");
        throw err;
      }
    },
    [peerManager, options?.playerName, options?.playerAvatar],
  );

  const joinGame = useCallback(
    async (
      roomId: string,
      profile?: PeerProfile,
    ): Promise<{ peerId: string; reconnectRequested: boolean }> => {
      if (!peerManager.initClient) throw new Error("initClient not available on this peer manager");
      setStatus("CONNECTING");
      try {
        const id = await peerManager.initClient(roomId);
        setMyPeerId(id);
        setHostPeerId(roomId);
        setIsHost(false);
        setStatus("CONNECTED");
        setError(null);
        syncRoomUrlToAddressBar(roomId);

        const prevSession = loadSession(roomId);
        const username =
          profile?.username || options?.playerName || prevSession?.username || "Joueur";
        const avatar =
          profile?.avatar || options?.playerAvatar || prevSession?.avatar || "👤";

        let reconnectRequested = false;
        if (prevSession && prevSession.previousPeerId !== id) {
          reconnectRequested = true;
          peerManager.sendToHost("REQUEST_RECONNECT", {
            previousPeerId: prevSession.previousPeerId,
            username,
            sessionToken: prevSession.sessionToken,
          });
        }

        sessionTokenRef.current = createSessionToken();
        saveSession(roomId, {
          previousPeerId: id,
          username,
          avatar,
          role: "player",
          sessionToken: sessionTokenRef.current,
        });
        peerManager.sendToHost("REGISTER_SESSION", {
          sessionToken: sessionTokenRef.current,
        });

        return { peerId: id, reconnectRequested };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Impossible de rejoindre le salon.";
        setError(message);
        setStatus("DISCONNECTED");
        throw err;
      }
    },
    [peerManager, options?.playerName, options?.playerAvatar],
  );

  // Ensure host has our session token once presence handlers are wired.
  useEffect(() => {
    if (status !== "CONNECTED" || !myPeerId) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const ping = () => {
      peerManager.sendToHost("REGISTER_SESSION", {
        sessionToken: sessionTokenRef.current,
      });
      tries += 1;
      if (tries < 6) timer = setTimeout(ping, 250);
    };
    ping();
    return () => clearTimeout(timer);
  }, [status, myPeerId, peerManager]);

  const sendAction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (actionName: string, payload: any = {}) => {
      peerManager.sendToHost("ACTION", {
        actionName,
        playerId: myPeerId,
        payload,
      } as Record<string, unknown>);
    },
    [peerManager, myPeerId],
  );

  const sendChat = useCallback(
    (senderName: string, text: string) => {
      peerManager.sendChat(senderName, text);
    },
    [peerManager],
  );

  const playSfx = useCallback(
    (sfxName: string, intensity?: number) => {
      peerManager.sendAudio(sfxName, intensity);
    },
    [peerManager],
  );

  const disconnect = useCallback(() => {
    if (hostPeerId) clearSession(hostPeerId);
    peerManager.disconnect();
    setMyPeerId(null);
    setHostPeerId(null);
    setIsHost(false);
    setConnectedPeers([]);
    setChatMessages([]);
    setGameState(null);
    setCustomMessages([]);
    setStatus("IDLE");
    clearRoomUrlFromAddressBar();
  }, [peerManager, hostPeerId]);

  return {
    myPeerId,
    hostPeerId,
    isHost,
    connectedPeers,
    chatMessages,
    gameState,
    setGameState,
    customMessages,
    status,
    error,
    hostGame,
    joinGame,
    sendAction,
    sendChat,
    playSfx,
    disconnect,
    peerManager,
  };
}
