import type { PeerManagerLike } from "../peer/PeerManagerLike";
import type {
  NetworkMessage,
  VoiceModerationActionMessage,
  VoiceParticipantState,
  VoiceStateUpdateMessage,
} from "../peer/types";

export interface VoiceManagerOptions {
  peerManager: PeerManagerLike<any>;
  username?: string;
  avatar?: string;
  defaultMuted?: boolean;
}

export class VoiceManager {
  private peerManager: PeerManagerLike<any>;
  public localStream: MediaStream | null = null;
  public mediaCalls: Map<string, any> = new Map();
  public remoteStreams: Map<string, MediaStream> = new Map();
  public audioElements: Map<string, HTMLAudioElement> = new Map();

  public participantStates: Map<string, VoiceParticipantState> = new Map();
  public localMutes: Set<string> = new Set();
  public localVolumes: Map<string, number> = new Map();

  public selfMuted: boolean = true;
  public deafened: boolean = false;
  public serverMuted: boolean = false;
  public lockMuted: boolean = false;
  public isSpeaking: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;
  private listeners: Set<() => void> = new Set();

  private username: string;
  private avatar: string;

  constructor(options: VoiceManagerOptions) {
    this.peerManager = options.peerManager;
    this.username = options.username || "Joueur";
    this.avatar = options.avatar || "👤";
    this.selfMuted = options.defaultMuted ?? true;

    this.setupNetworkListeners();
    this.initLocalVoiceState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public updateProfile(username?: string, avatar?: string): void {
    if (username) this.username = username;
    if (avatar) this.avatar = avatar;

    const myId = this.peerManager.myPeerId;
    if (myId) {
      const state = this.participantStates.get(myId);
      if (state) {
        if (username) state.username = username;
        if (avatar) state.avatar = avatar;
        this.participantStates.set(myId, state);
      }
    }
    this.broadcastState();
    this.notify();
  }

  public syncMembersFromPeerManager(): void {
    const pm = this.peerManager as any;
    const members = pm.members || pm.lobbyState?.members || pm.lobbyPlayers;
    if (Array.isArray(members)) {
      const myId = pm.myPeerId;
      const activeMemberIds = new Set<string>();
      if (myId) activeMemberIds.add(myId);
      activeMemberIds.add("local");

      members.forEach((m: any) => {
        if (!m.peerId) return;
        activeMemberIds.add(m.peerId);
        if (m.peerId === myId) {
          if (m.username) this.username = m.username;
          if (m.avatar) this.avatar = m.avatar;
        }
        const existing = this.participantStates.get(m.peerId);
        this.participantStates.set(m.peerId, {
          peerId: m.peerId,
          username: m.username || existing?.username || "Joueur",
          avatar: m.avatar || existing?.avatar || (m.peerId === pm.hostPeerId ? "👑" : "👤"),
          selfMuted: existing?.selfMuted ?? true,
          deafened: existing?.deafened ?? false,
          serverMuted: existing?.serverMuted ?? false,
          lockMuted: existing?.lockMuted ?? false,
          isSpeaking: existing?.isSpeaking ?? false,
        });
      });

      // Purge any participant that is no longer in the active members list
      for (const peerId of Array.from(this.participantStates.keys())) {
        if (!activeMemberIds.has(peerId)) {
          this.cleanupPeerAudio(peerId);
        }
      }

      this.notify();
    }
  }

  private setupNetworkListeners(): void {
    const pm = this.peerManager as any;
    const originalOnPlayersUpdate = pm.onPlayersUpdate;
    pm.onPlayersUpdate = () => {
      originalOnPlayersUpdate?.();
      this.syncMembersFromPeerManager();
      this.broadcastState();
    };

    const originalOnVoiceMessage = this.peerManager.onVoiceMessage;
    this.peerManager.onVoiceMessage = (msg: NetworkMessage) => {
      originalOnVoiceMessage?.(msg);
      this.handleVoiceMessage(msg);
    };

    const originalPeerStatusChange = this.peerManager.onPeerStatusChange;
    this.peerManager.onPeerStatusChange = (peerId: string, status: "CONNECTED" | "DISCONNECTED") => {
      originalPeerStatusChange?.(peerId, status);
      this.syncMembersFromPeerManager();
      if (status === "CONNECTED") {
        this.broadcastState();
        if (this.localStream) {
          this.callPeer(peerId);
        }
      } else if (status === "DISCONNECTED") {
        this.cleanupPeerAudio(peerId);
      }
    };

    const attachCallListener = () => {
      const peer = this.peerManager.getPeer?.() || (this.peerManager as any).peer;
      if (peer) {
        peer.on("call", (call: any) => {
          call.answer(this.localStream || undefined);
          this.handleIncomingCall(call);
        });
      } else {
        setTimeout(attachCallListener, 150);
      }
    };
    attachCallListener();
  }

  private initLocalVoiceState(): void {
    const myId = this.peerManager.myPeerId || "local";
    const localState: VoiceParticipantState = {
      peerId: myId,
      username: this.username,
      avatar: this.avatar,
      selfMuted: this.selfMuted,
      deafened: this.deafened,
      serverMuted: this.serverMuted,
      lockMuted: this.lockMuted,
      isSpeaking: this.isSpeaking,
    };
    this.participantStates.set(myId, localState);
    this.syncMembersFromPeerManager();
  }

  public availableDevices: Array<{ deviceId: string; label: string }> = [];
  public selectedDeviceId: string = "";
  public inputVolume: number = 1.0;
  private inputGainNode: GainNode | null = null;
  private dummyGainNode: GainNode | null = null;
  private rawLocalStream: MediaStream | null = null;

  public async enumerateAudioDevices(): Promise<Array<{ deviceId: string; label: string }>> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
      this.availableDevices = audioInputs;
      if (!this.selectedDeviceId && audioInputs.length > 0) {
        this.selectedDeviceId = audioInputs[0].deviceId;
      }
      this.notify();
      return audioInputs;
    } catch (err) {
      console.warn("[p2play-core/voice] Could not enumerate audio devices:", err);
      return [];
    }
  }

  public async switchAudioDevice(deviceId: string): Promise<boolean> {
    this.selectedDeviceId = deviceId;

    if (this.rawLocalStream) {
      this.rawLocalStream.getTracks().forEach((t) => t.stop());
      this.rawLocalStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    const success = await this.startMicrophone();
    if (!success || !this.localStream) return false;

    const activeStream = this.localStream as any as MediaStream;
    const newTrack = activeStream?.getAudioTracks?.()[0];
    if (newTrack) {
      this.mediaCalls.forEach((call) => {
        const peerConnection: RTCPeerConnection = call.peerConnection;
        if (peerConnection) {
          const senders = peerConnection.getSenders();
          const audioSender = senders.find((s) => s.track?.kind === "audio");
          if (audioSender) {
            audioSender.replaceTrack(newTrack).catch((err) => {
              console.warn("[p2play-core/voice] replaceTrack failed:", err);
            });
          }
        }
      });
    }

    this.notify();
    return true;
  }

  public setInputVolume(volume: number): void {
    this.inputVolume = Math.max(0, Math.min(2.0, volume));
    if (this.inputGainNode) {
      this.inputGainNode.gain.value = this.inputVolume;
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    this.notify();
  }

  public async startMicrophone(): Promise<boolean> {
    if (this.lockMuted) {
      console.warn("[p2play-core/voice] Microphone is locked by host.");
      return false;
    }

    if (this.localStream) {
      this.selfMuted = false;
      this.applyMuteToTracks();
      this.broadcastState();
      this.notify();
      return true;
    }

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (this.selectedDeviceId) {
        audioConstraints.deviceId = { exact: this.selectedDeviceId };
      }

      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      this.rawLocalStream = rawStream;
      this.enumerateAudioDevices().catch(() => {});

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        if (!this.audioContext || this.audioContext.state === "closed") {
          this.audioContext = new AudioCtxClass();
        }
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume().catch(() => {});
        }

        const source = this.audioContext.createMediaStreamSource(rawStream);
        this.inputGainNode = this.audioContext.createGain();
        this.inputGainNode.gain.value = this.inputVolume;

        // Dummy silent sink to keep Web Audio graph active for WebRTC senders
        this.dummyGainNode = this.audioContext.createGain();
        this.dummyGainNode.gain.value = 0.00001;
        this.dummyGainNode.connect(this.audioContext.destination);

        const destination = this.audioContext.createMediaStreamDestination();
        source.connect(this.inputGainNode);
        this.inputGainNode.connect(destination);
        this.inputGainNode.connect(this.dummyGainNode);

        const outputTrack = destination.stream.getAudioTracks()[0];
        this.localStream = new MediaStream([outputTrack]);
      } else {
        this.localStream = rawStream;
      }

      this.selfMuted = false;
      this.setupVAD(rawStream);
      this.applyMuteToTracks();

      this.connectToAllPeers();
      this.broadcastState();
      this.notify();
      return true;
    } catch (err) {
      console.warn("[p2play-core/voice] Could not acquire microphone:", err);
      return false;
    }
  }

  public stopMicrophone(): void {
    this.selfMuted = true;
    this.applyMuteToTracks();
    this.broadcastState();
    this.notify();
  }

  public get active(): boolean {
    return !!this.localStream;
  }

  public get isHost(): boolean {
    return (this.peerManager as any)?.isHost ?? false;
  }

  public toggleMic(): void {
    this.toggleSelfMute();
  }

  public isLocalMuted(targetPeerId: string): boolean {
    return this.localMutes.has(targetPeerId);
  }

  public getLocalVolume(targetPeerId: string): number {
    return this.localVolumes.get(targetPeerId) ?? 1.0;
  }

  public toggleSelfMute(): void {
    if (this.lockMuted && !this.selfMuted) return;

    if (!this.localStream && this.selfMuted) {
      this.startMicrophone();
      return;
    }

    this.selfMuted = !this.selfMuted;
    this.applyMuteToTracks();
    this.broadcastState();
    this.notify();
  }

  private applyMuteToTracks(): void {
    const isMuted = this.selfMuted || this.serverMuted || this.deafened;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (this.rawLocalStream) {
      this.rawLocalStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  public connectToAllPeers(): void {
    if (!this.localStream) return;
    const myId = this.peerManager.myPeerId;

    this.peerManager.connections.forEach((_conn, peerId) => {
      if (peerId !== myId) this.callPeer(peerId);
    });

    this.participantStates.forEach((_state, peerId) => {
      if (peerId !== myId) this.callPeer(peerId);
    });
  }

  private callPeer(targetPeerId: string): void {
    const peer = this.peerManager.getPeer?.() || (this.peerManager as any).peer;
    if (!peer || !this.localStream) return;

    try {
      let callTarget = targetPeerId;
      const pm = this.peerManager as any;
      if (targetPeerId === this.peerManager.hostPeerId && pm.namespaceId && typeof pm.namespaceId === "function") {
        callTarget = pm.namespaceId(targetPeerId);
      }

      const call = peer.call(callTarget, this.localStream);
      if (call) {
        this.handleIncomingCall(call, targetPeerId);
      }
    } catch (e) {
      console.warn("[p2play-core/voice] Error calling peer:", targetPeerId, e);
    }
  }

  private handleIncomingCall(call: any, overridePeerId?: string): void {
    const peerId = overridePeerId || call.peer;

    const existingCall = this.mediaCalls.get(peerId);
    if (existingCall && existingCall !== call) {
      try { existingCall.close(); } catch (_) {}
    }
    this.mediaCalls.set(peerId, call);

    call.on("stream", (remoteStream: MediaStream) => {
      this.remoteStreams.set(peerId, remoteStream);
      this.attachAudioElement(peerId, remoteStream);
      this.notify();
    });

    call.on("close", () => {
      this.cleanupPeerAudio(peerId);
    });

    call.on("error", (err: any) => {
      console.warn("[p2play-core/voice] Call error:", peerId, err);
      this.cleanupPeerAudio(peerId);
    });
  }

  private attachAudioElement(peerId: string, stream: MediaStream): void {
    let audio = this.audioElements.get(peerId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.id = `voice-audio-${peerId}`;
      document.body.appendChild(audio);
      this.audioElements.set(peerId, audio);
    }
    audio.srcObject = stream;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const resume = () => {
          audio?.play().catch(() => {});
          window.removeEventListener("click", resume);
        };
        window.addEventListener("click", resume, { once: true });
      });
    }
    this.updateAllAudioVolumes();
  }

  public toggleDeafen(): void {
    this.deafened = !this.deafened;
    this.applyMuteToTracks();
    this.updateAllAudioVolumes();
    this.broadcastState();
    this.notify();
  }

  public updateAllAudioVolumes(): void {
    const apply = (audio: HTMLAudioElement, key: string) => {
      const isMutedLocally = this.localMutes.has(key);
      const vol = this.localVolumes.get(key) ?? 1.0;
      const shouldMute = this.deafened || isMutedLocally;

      audio.muted = shouldMute;
      audio.volume = shouldMute ? 0 : Math.max(0, Math.min(1, vol));
    };

    this.audioElements.forEach((audio, key) => apply(audio, key));

    document.querySelectorAll<HTMLAudioElement>('audio[id^="voice-audio-"]').forEach((audio) => {
      const key = audio.id.replace("voice-audio-", "");
      apply(audio, key);
    });
  }

  public toggleLocalMute(peerId: string): void {
    if (this.localMutes.has(peerId)) {
      this.localMutes.delete(peerId);
    } else {
      this.localMutes.add(peerId);
    }
    this.updateAllAudioVolumes();
    this.notify();
  }

  public setLocalVolume(peerId: string, volume: number): void {
    this.localVolumes.set(peerId, Math.max(0, Math.min(1, volume)));
    this.updateAllAudioVolumes();
    this.notify();
  }

  // --- Host Moderation Controls ---

  public serverMute(targetPeerId: string, mute: boolean): void {
    if (!this.peerManager.isHost) return;
    const msg: VoiceModerationActionMessage = {
      type: "VOICE_MODERATION_ACTION",
      targetPeerId,
      action: mute ? "SERVER_MUTE" : "SERVER_UNMUTE",
    };
    this.peerManager.broadcast(msg);
    this.handleVoiceMessage(msg);
  }

  public lockMute(targetPeerId: string, lock: boolean): void {
    if (!this.peerManager.isHost) return;
    const msg: VoiceModerationActionMessage = {
      type: "VOICE_MODERATION_ACTION",
      targetPeerId,
      action: lock ? "LOCK_MUTE" : "LOCK_UNMUTE",
    };
    this.peerManager.broadcast(msg);
    this.handleVoiceMessage(msg);
  }

  // --- VAD & Signaling ---

  private setupVAD(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.vadInterval = window.setInterval(() => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
        if (!this.analyser || this.selfMuted || this.serverMuted || this.deafened) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.broadcastState();
            this.notify();
          }
          return;
        }
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const speakingNow = average > 15;

        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.broadcastState();
          this.notify();
        }
      }, 100);
    } catch (e) {
      console.warn("[p2play-core/voice] Failed to initialize VAD:", e);
    }
  }

  public broadcastState(): void {
    const myId = this.peerManager.myPeerId || "local";
    if (myId !== "local" && this.participantStates.has("local")) {
      const localState = this.participantStates.get("local")!;
      localState.peerId = myId;
      this.participantStates.delete("local");
      this.participantStates.set(myId, localState);
    }

    const state: VoiceParticipantState = {
      peerId: myId,
      username: this.username,
      avatar: this.avatar,
      selfMuted: this.selfMuted,
      deafened: this.deafened,
      serverMuted: this.serverMuted,
      lockMuted: this.lockMuted,
      isSpeaking: this.isSpeaking,
    };
    this.participantStates.set(myId, state);
    this.syncMembersFromPeerManager();

    const msg: VoiceStateUpdateMessage = {
      type: "VOICE_STATE_UPDATE",
      sender: myId,
      voiceState: state,
    };

    if (this.peerManager.isHost) {
      this.peerManager.broadcast(msg);
      this.syncAllStatesToAllPeers();
    } else {
      this.peerManager.sendToHost("VOICE_STATE_UPDATE", { sender: myId, voiceState: state });
    }
  }

  private syncAllStatesToAllPeers(): void {
    if (!this.peerManager.isHost) return;
    this.participantStates.forEach((state) => {
      const msg: VoiceStateUpdateMessage = {
        type: "VOICE_STATE_UPDATE",
        sender: this.peerManager.myPeerId || "host",
        voiceState: state,
      };
      this.peerManager.broadcast(msg);
    });
  }

  private handleVoiceMessage(msg: NetworkMessage): void {
    this.syncMembersFromPeerManager();

    if (msg.type === "VOICE_STATE_UPDATE") {
      const update = msg as unknown as VoiceStateUpdateMessage;
      if (update.voiceState?.peerId) {
        if (this.participantStates.has(update.voiceState.peerId)) {
          this.participantStates.set(update.voiceState.peerId, update.voiceState);
          this.notify();
        }

        if (this.peerManager.isHost) {
          this.syncAllStatesToAllPeers();
        }
      }
    } else if (msg.type === "VOICE_MODERATION_ACTION") {
      const mod = msg as unknown as VoiceModerationActionMessage;
      const myId = this.peerManager.myPeerId;

      if (mod.targetPeerId === myId) {
        if (mod.action === "SERVER_MUTE") this.serverMuted = true;
        if (mod.action === "SERVER_UNMUTE") this.serverMuted = false;
        if (mod.action === "LOCK_MUTE") {
          this.lockMuted = true;
          this.selfMuted = true;
        }
        if (mod.action === "LOCK_UNMUTE") this.lockMuted = false;

        this.applyMuteToTracks();
        this.broadcastState();
        this.notify();
      } else {
        const targetState = this.participantStates.get(mod.targetPeerId);
        if (targetState) {
          if (mod.action === "SERVER_MUTE") targetState.serverMuted = true;
          if (mod.action === "SERVER_UNMUTE") targetState.serverMuted = false;
          if (mod.action === "LOCK_MUTE") {
            targetState.lockMuted = true;
            targetState.selfMuted = true;
          }
          if (mod.action === "LOCK_UNMUTE") targetState.lockMuted = false;
          this.notify();
        }
      }
    }
  }

  private cleanupPeerAudio(peerId: string): void {
    const call = this.mediaCalls.get(peerId);
    if (call) {
      call.close();
      this.mediaCalls.delete(peerId);
    }
    this.remoteStreams.delete(peerId);

    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerId);
    }
    this.participantStates.delete(peerId);
    this.notify();
  }

  public destroy(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioElements.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.audioElements.clear();
    this.mediaCalls.forEach((call) => call.close());
    this.mediaCalls.clear();
    this.listeners.clear();
  }
}
