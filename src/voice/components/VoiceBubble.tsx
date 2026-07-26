import React from "react";
import type { VoiceParticipantState } from "../../peer/types";

export interface VoiceBubbleProps {
  participant: VoiceParticipantState;
  isSelf?: boolean;
  isHost?: boolean;
  className?: string;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  participant,
  isSelf = false,
  isHost = false,
  className = "",
}) => {
  const isMuted = participant.selfMuted || participant.serverMuted || participant.lockMuted;
  const isSpeaking = participant.isSpeaking && !isMuted && !participant.deafened;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
        flex: 1,
      }}
      className={className}
    >
      {/* Avatar Circle with Speaking Ring */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "Center",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: isSpeaking ? "rgba(6, 78, 59, 0.9)" : "rgba(39, 39, 42, 0.9)",
            color: isSpeaking ? "#6ee7b7" : "#e4e4e7",
            border: isSpeaking ? "2px solid #34d399" : "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: isSpeaking ? "0 0 14px rgba(52, 211, 153, 0.7)" : "none",
            transition: "all 0.2s ease-in-out",
          }}
        >
          {participant.avatar || "👤"}
        </div>

        {isMuted && (
          <span
            style={{
              position: "absolute",
              bottom: "-2px",
              right: "-2px",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "#881337",
              border: "1.5px solid #e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              lineHeight: 1,
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
            title="Micro coupé"
          >
            🔇
          </span>
        )}
      </div>

      {/* Name and Badges */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "13px",
            color: "#f4f4f5",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {participant.username || participant.peerId.slice(0, 6)}
        </span>

        {isHost && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px 6px",
              borderRadius: "6px",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              flexShrink: 0,
            }}
            title="Créateur du salon"
          >
            Hôte
          </span>
        )}

        {isSelf && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px 5px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#a1a1aa",
              fontSize: "10px",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            Vous
          </span>
        )}

        {/* Lock mute indicator */}
        {participant.lockMuted && (
          <span
            style={{ fontSize: "12px", marginLeft: "auto" }}
            title="Micro verrouillé par l'hôte"
          >
            🔒
          </span>
        )}
      </div>
    </div>
  );
};
