import React, { useState } from "react";
import { Mic, MicOff, Headphones, ChevronLeft } from "lucide-react";
import type { PeerManagerLike } from "../../peer/PeerManagerLike";
import { useVoiceChat } from "../useVoiceChat";
import { VoiceChatMinimized } from "./VoiceChatMinimized";
import { VoiceParticipantRow } from "./VoiceParticipantRow";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { cn } from "../../ui/utils";

export interface VoiceChatPanelProps {
  peerManager: PeerManagerLike<any> | null;
  username?: string;
  avatar?: string;
  title?: string;
  collapsible?: boolean;
  defaultMinimized?: boolean;
  className?: string;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  peerManager,
  username,
  avatar,
  title = "Voice Salon P2P",
  collapsible = true,
  defaultMinimized = true,
  className = "",
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const voice = useVoiceChat({ peerManager, username, avatar });
  const {
    active,
    participants,
    selfMuted,
    deafened,
    lockMuted,
    serverMuted,
    isHost,
    myPeerId,
    toggleMic,
    toggleDeafen,
    toggleLocalMute,
    setLocalVolume,
    availableDevices,
    selectedDeviceId,
    switchAudioDevice,
    inputVolume,
    setInputVolume,
    serverMute,
    lockMute,
    isLocalMuted,
    getLocalVolume,
  } = voice;

  const activeSpeakersCount = participants.filter(
    (p) => p.isSpeaking && !p.selfMuted && !p.serverMuted && !p.deafened,
  ).length;

  if (isMinimized) {
    return (
      <VoiceChatMinimized
        participants={participants}
        className={className}
        onExpand={() => setIsMinimized(false)}
      />
    );
  }

  const micMuted = selfMuted || serverMuted || lockMuted;

  return (
    <div
      className={cn(
        "flex w-[300px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-zinc-950/95 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 bg-zinc-900/80 px-3.5 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-100">
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span
              className={cn(
                "inline-block size-2 shrink-0 rounded-full",
                active ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-amber-500",
              )}
            />
            <span>{participants.length} connecté(s)</span>
            {activeSpeakersCount > 0 ? (
              <Badge
                variant="outline"
                className="h-4 border-emerald-500/40 px-1.5 text-[9px] text-emerald-300"
              >
                {activeSpeakersCount} direct
              </Badge>
            ) : null}
          </div>
        </div>
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"
            onClick={() => setIsMinimized(true)}
            title="Réduire"
          >
            <ChevronLeft className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* Mic / Deafen */}
      <div className="flex gap-2 border-b border-white/8 bg-zinc-950/50 px-2.5 py-2.5">
        <Button
          type="button"
          size="sm"
          disabled={lockMuted}
          onClick={toggleMic}
          className={cn(
            "h-9 flex-1 gap-1.5 rounded-xl text-[11px] font-semibold",
            micMuted
              ? "border border-rose-500/35 bg-rose-950/50 text-rose-200 hover:bg-rose-900/50"
              : "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:bg-emerald-900/50",
          )}
        >
          {micMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          <span>{lockMuted ? "Verrouillé" : micMuted ? "Muter" : "Actif"}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={toggleDeafen}
          className={cn(
            "h-9 flex-1 gap-1.5 rounded-xl text-[11px] font-semibold",
            deafened
              ? "border border-violet-500/40 bg-violet-950/50 text-violet-200 hover:bg-violet-900/50"
              : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
          )}
        >
          <Headphones className="size-3.5" />
          <span>{deafened ? "Sourdine" : "Casque"}</span>
        </Button>
      </div>

      {availableDevices.length > 0 ? (
        <div className="border-b border-white/5 px-2.5 py-2">
          <select
            value={selectedDeviceId}
            onChange={(e) => switchAudioDevice(e.target.value)}
            className="w-full truncate rounded-xl border border-white/10 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-400 outline-none"
            title="Choisir le microphone"
          >
            {availableDevices.map((dev) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                🎙️ {dev.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Participants */}
      <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto p-2.5">
        {participants.length === 0 ? (
          <p className="py-4 text-center font-mono text-[11px] text-zinc-500">
            Aucun participant connecté
          </p>
        ) : (
          participants.map((p) => (
            <VoiceParticipantRow
              key={p.peerId}
              participant={p}
              isSelf={p.peerId === myPeerId}
              isHostViewer={isHost}
              isRoomHost={p.peerId === peerManager?.hostPeerId}
              inputVolume={inputVolume}
              localVolume={getLocalVolume(p.peerId)}
              localMuted={isLocalMuted(p.peerId)}
              onSetInputVolume={setInputVolume}
              onSetLocalVolume={setLocalVolume}
              onToggleLocalMute={toggleLocalMute}
              onServerMute={serverMute}
              onLockMute={lockMute}
            />
          ))
        )}
      </div>
    </div>
  );
};
