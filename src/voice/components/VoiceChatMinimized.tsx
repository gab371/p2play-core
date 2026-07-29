import React from "react";
import type { VoiceParticipantState } from "../../peer/types";
import { Avatar, AvatarFallback, AvatarBadge } from "../../ui/avatar";
import { cn } from "../../ui/utils";

interface VoiceChatMinimizedProps {
  participants: VoiceParticipantState[];
  className?: string;
  onExpand: () => void;
}

export const VoiceChatMinimized: React.FC<VoiceChatMinimizedProps> = ({
  participants,
  className,
  onExpand,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onExpand}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") onExpand();
    }}
    className={cn("flex cursor-pointer flex-col gap-2.5 p-1.5 select-none", className)}
    title="Cliquer pour ouvrir le salon vocal"
  >
    {participants.map((p) => {
      const isMuted = p.selfMuted || p.serverMuted || p.lockMuted;
      const isSpeaking = p.isSpeaking && !isMuted && !p.deafened;
      const label = p.username || p.peerId;
      return (
        <div
          key={p.peerId}
          title={`${label}${isSpeaking ? " (En direct)" : isMuted ? " (Micro coupé)" : ""}`}
        >
          <Avatar
            size="lg"
            className={cn(
              isSpeaking && "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]",
            )}
          >
            <AvatarFallback
              className={cn(
                "text-[22px]",
                isSpeaking ? "bg-emerald-950 text-emerald-300" : "bg-zinc-900 text-zinc-100",
              )}
            >
              {p.avatar || "👤"}
            </AvatarFallback>
            {isMuted ? (
              <AvatarBadge className="bg-rose-900 text-[11px] ring-rose-500">🔇</AvatarBadge>
            ) : null}
          </Avatar>
        </div>
      );
    })}
  </div>
);
