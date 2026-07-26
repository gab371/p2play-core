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

  // 1. Initialize VoiceManager instance ONLY when peerManager changes (prevents destroying stream on avatar/username updates)
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
  }, [peerManager]);

  // 2. Dynamic profile updates without destroying VoiceManager or resetting muted state
  useEffect(() => {
    if (managerRef.current && (username || avatar)) {
      managerRef.current.updateProfile(username, avatar);
    }
  }, [username, avatar]);

  return {
    manager,
    active: manager?.active ?? false,
    participants,
    selfMuted,
    deafened,
    lockMuted,
    serverMuted,
    isHost: manager?.isHost ?? false,
    myPeerId: peerManager?.myPeerId ?? null,
    startMicrophone: () => managerRef.current?.startMicrophone(),
    stopMicrophone: () => managerRef.current?.stopMicrophone(),
    toggleMic: () => managerRef.current?.toggleMic(),
    toggleDeafen: () => managerRef.current?.toggleDeafen(),
    toggleLocalMute: (targetPeerId: string) => managerRef.current?.toggleLocalMute(targetPeerId),
    setLocalVolume: (targetPeerId: string, volume: number) => managerRef.current?.setLocalVolume(targetPeerId, volume),
    serverMute: (targetPeerId: string, muted: boolean) => managerRef.current?.serverMute(targetPeerId, muted),
    lockMute: (targetPeerId: string, locked: boolean) => managerRef.current?.lockMute(targetPeerId, locked),
    isLocalMuted: (targetPeerId: string) => managerRef.current?.isLocalMuted(targetPeerId) ?? false,
    getLocalVolume: (targetPeerId: string) => managerRef.current?.getLocalVolume(targetPeerId) ?? 1.0,
  };
}
