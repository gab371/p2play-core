import React, { useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Ban, Lock, LockOpen, X } from "lucide-react";
import type { VoiceParticipantState } from "../../peer/types";
import { VoiceBubble } from "./VoiceBubble";
import { Button } from "../../ui/button";
import { Slider } from "../../ui/slider";
import { cn } from "../../ui/utils";

interface VoiceParticipantRowProps {
  participant: VoiceParticipantState;
  isSelf: boolean;
  isHostViewer: boolean;
  isRoomHost: boolean;
  inputVolume: number;
  localVolume: number;
  localMuted: boolean;
  onSetInputVolume: (v: number) => void;
  onSetLocalVolume: (peerId: string, v: number) => void;
  onToggleLocalMute: (peerId: string) => void;
  onServerMute: (peerId: string, muted: boolean) => void;
  onLockMute: (peerId: string, locked: boolean) => void;
}

const btnRound =
  "rounded-xl border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10";

export const VoiceParticipantRow: React.FC<VoiceParticipantRowProps> = ({
  participant: p,
  isSelf,
  isHostViewer,
  isRoomHost,
  inputVolume,
  localVolume,
  localMuted,
  onSetInputVolume,
  onSetLocalVolume,
  onToggleLocalMute,
  onServerMute,
  onLockMute,
}) => {
  const [showVol, setShowVol] = useState(false);
  const volPct = Math.round((isSelf ? inputVolume : localVolume) * 100);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900/70 p-2.5">
      <VoiceBubble participant={p} isSelf={isSelf} isHost={isRoomHost} stacked />

      <div className="flex items-center justify-end gap-1.5">
        {showVol ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-2.5 py-1.5">
            <span
              className={cn(
                "w-8 shrink-0 text-right font-mono text-[10px]",
                isSelf ? "text-emerald-300" : "text-zinc-400",
              )}
            >
              {volPct}%
            </span>
            <Slider
              min={0}
              max={isSelf ? 200 : 100}
              step={5}
              value={[volPct]}
              onValueChange={(vals) => {
                const next = (vals[0] ?? 0) / 100;
                if (isSelf) onSetInputVolume(next);
                else onSetLocalVolume(p.peerId, next);
              }}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 shrink-0 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              onClick={() => setShowVol(false)}
              title="Fermer"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className={cn(
              "h-7 gap-1 rounded-xl px-2.5 font-mono text-[10px]",
              btnRound,
              isSelf && "border-emerald-500/25 text-emerald-300",
            )}
            onClick={() => setShowVol(true)}
            title={isSelf ? "Volume d'entrée micro" : "Ajuster le volume"}
          >
            {isSelf ? <Mic className="size-3" /> : <Volume2 className="size-3" />}
            <span>{volPct}%</span>
          </Button>
        )}

        {!isSelf && !showVol ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              className={cn(
                "size-7",
                btnRound,
                localMuted && "border-rose-500/40 bg-rose-950/40 text-rose-300",
              )}
              onClick={() => onToggleLocalMute(p.peerId)}
              title={localMuted ? "Rétablir le son" : "Muter pour moi"}
            >
              {localMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </Button>

            {isHostViewer ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className={cn(
                    "size-7",
                    btnRound,
                    p.serverMuted && "border-rose-500/40 bg-rose-950/40 text-rose-300",
                  )}
                  onClick={() => onServerMute(p.peerId, !p.serverMuted)}
                  title={p.serverMuted ? "Démuter globalement" : "Muter globalement"}
                >
                  <Ban className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className={cn(
                    "size-7",
                    btnRound,
                    p.lockMuted && "border-amber-500/40 bg-amber-950/40 text-amber-300",
                  )}
                  onClick={() => onLockMute(p.peerId, !p.lockMuted)}
                  title={p.lockMuted ? "Déverrouiller micro" : "Verrouiller micro"}
                >
                  {p.lockMuted ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};
