import { useEffect, useRef, useState } from "react";
import type { PeerManagerLike } from "../peer/PeerManagerLike";
import type { VoiceParticipantState } from "../peer/types";
import { VoiceManager } from "./VoiceManager";

export interface UseVoiceChatOptions {
  peerManager: PeerManagerLike<any> | null;
  username?: string;
  avatar?: string;
  defaultMuted?: boolean;
  autoStart?: boolean;
}

export function useVoiceChat({
  peerManager,
  username,
  avatar,
  defaultMuted = true,
  autoStart = false,
}: UseVoiceChatOptions) {
  const [manager, setManager] = useState<VoiceManager | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipantState[]>([]);
  const [selfMuted, setSelfMuted] = useState(defaultMuted);
  const [deafened, setDeafened] = useState(false);
  const [lockMuted, setLockMuted] = useState(false);
  const [serverMuted, setServerMuted] = useState(false);

  const managerRef = useRef<VoiceManager | null>(null);

  useEffect(() => {
    if (!peerManager) {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
        setManager(null);
      }
      return;
    }

    const vm = new VoiceManager({
      peerManager,
      username,
      avatar,
      defaultMuted,
    });

    managerRef.current = vm;
    setManager(vm);

    const updateState = () => {
      setParticipants(Array.from(vm.participantStates.values()));
      setSelfMuted(vm.selfMuted);
      setDeafened(vm.deafened);
      setLockMuted(vm.lockMuted);
      setServerMuted(vm.serverMuted);
    };

    const unsubscribe = vm.subscribe(updateState);
    updateState();

    if (autoStart) {
      vm.startMicrophone();
    }

    return () => {
      unsubscribe();
      vm.destroy();
      managerRef.current = null;
    };
  }, [peerManager, username, avatar, defaultMuted, autoStart]);

  const toggleMic = () => {
    manager?.toggleSelfMute();
  };

  const toggleDeafen = () => {
    manager?.toggleDeafen();
  };

  const toggleLocalMute = (peerId: string) => {
    manager?.toggleLocalMute(peerId);
  };

  const setLocalVolume = (peerId: string, volume: number) => {
    manager?.setLocalVolume(peerId, volume);
  };

  const serverMute = (targetPeerId: string, mute: boolean) => {
    manager?.serverMute(targetPeerId, mute);
  };

  const lockMute = (targetPeerId: string, lock: boolean) => {
    manager?.lockMute(targetPeerId, lock);
  };

  return {
    voiceManager: manager,
    active: !selfMuted,
    participants,
    selfMuted,
    deafened,
    lockMuted,
    serverMuted,
    isHost: peerManager?.isHost ?? false,
    myPeerId: peerManager?.myPeerId,
    toggleMic,
    toggleDeafen,
    toggleLocalMute,
    setLocalVolume,
    serverMute,
    lockMute,
    isLocalMuted: (peerId: string) => manager?.localMutes.has(peerId) ?? false,
    getLocalVolume: (peerId: string) => manager?.localVolumes.get(peerId) ?? 1.0,
  };
}
