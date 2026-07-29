import React from "react";
import type { VoiceParticipantState } from "../../peer/types";
import { Avatar, AvatarFallback, AvatarBadge } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { cn } from "../../ui/utils";

export interface VoiceBubbleProps {
  participant: VoiceParticipantState;
  isSelf?: boolean;
  isHost?: boolean;
  /** When true, name can use full row width (controls sit below / aside). */
  stacked?: boolean;
  className?: string;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  participant,
  isSelf = false,
  isHost = false,
  stacked = false,
  className = "",
}) => {
  const isMuted = participant.selfMuted || participant.serverMuted || participant.lockMuted;
  const isSpeaking = participant.isSpeaking && !isMuted && !participant.deafened;
  const displayName = participant.username || participant.peerId.slice(0, 8);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        stacked ? "w-full" : "flex-1",
        className,
      )}
    >
      <Avatar
        size="default"
        className={cn(
          "shrink-0",
          isSpeaking && "ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]",
        )}
      >
        <AvatarFallback
          className={cn(
            "text-base",
            isSpeaking ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800 text-zinc-100",
          )}
        >
          {participant.avatar || "👤"}
        </AvatarFallback>
        {isMuted ? (
          <AvatarBadge
            className="size-4 bg-rose-900 text-[9px] ring-1 ring-rose-500"
            title="Micro coupé"
          >
            🔇
          </AvatarBadge>
        ) : null}
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate text-[13px] font-semibold leading-tight text-zinc-100"
          title={displayName}
        >
          {displayName}
        </span>
        {(isHost || isSelf || participant.lockMuted) && (
          <div className="flex flex-wrap items-center gap-1">
            {isHost ? (
              <Badge
                variant="outline"
                className="h-4 border-amber-500/40 px-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-300"
              >
                Hôte
              </Badge>
            ) : null}
            {isSelf ? (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[9px] font-medium text-zinc-300"
              >
                Vous
              </Badge>
            ) : null}
            {participant.lockMuted ? (
              <span className="text-[10px]" title="Micro verrouillé par l'hôte">
                🔒
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
