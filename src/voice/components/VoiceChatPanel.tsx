import React, { useState } from "react";
import type { PeerManagerLike } from "../../peer/PeerManagerLike";
import { useVoiceChat } from "../useVoiceChat";
import { VoiceBubble } from "./VoiceBubble";

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
  const [showVolumeFor, setShowVolumeFor] = useState<string | null>(null);

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
  } = useVoiceChat({
    peerManager,
    username,
    avatar,
  });

  const activeSpeakersCount = participants.filter(
    (p) => p.isSpeaking && !p.selfMuted && !p.serverMuted && !p.deafened
  ).length;

  // --- DISCORD IN-GAME OVERLAY MINIMIZED MODE (Floating Avatar Stream) ---
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "6px",
          cursor: "pointer",
          userSelect: "none",
          pointerEvents: "auto",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        className={className}
        title="Cliquer pour ouvrir le salon vocal (260px)"
      >
        {participants.map((p) => {
          const isSpeaking = p.isSpeaking && !p.selfMuted && !p.serverMuted && !p.deafened;
          const isMuted = p.selfMuted || p.serverMuted || p.lockMuted;

          return (
            <div
              key={p.peerId}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
              title={`${p.username || p.peerId} ${isSpeaking ? "(En direct)" : isMuted ? "(Micro coupé)" : ""}`}
            >
              {/* Avatar Circle with Glow */}
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  backgroundColor: isSpeaking ? "rgba(6, 78, 59, 0.95)" : "rgba(24, 25, 28, 0.9)",
                  border: isSpeaking ? "2.5px solid #10b981" : "1.5px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: isSpeaking
                    ? "0 0 20px rgba(16, 185, 129, 0.8), 0 8px 24px rgba(0,0,0,0.6)"
                    : "0 8px 24px rgba(0,0,0,0.6)",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.2s ease-in-out",
                  flexShrink: 0,
                }}
              >
                {p.avatar || "👤"}
              </div>

              {/* Mute badge icon */}
              {isMuted && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    left: "28px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "#881337",
                    border: "1.5px solid #e11d48",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    lineHeight: 1,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
                  }}
                >
                  🔇
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // --- DISCORD EXPANDED OVERLAY PANEL MODE (Fixed 260px Width Drawer) ---
  return (
    <div
      style={{
        width: "260px",
        backgroundColor: "rgba(20, 21, 24, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "16px",
        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        color: "#f4f4f5",
        fontSize: "12px",
        userSelect: "none",
        pointerEvents: "auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      className={className}
    >
      {/* Sidebar Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          backgroundColor: "rgba(30, 31, 35, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: active ? "#10b981" : "#f59e0b",
              boxShadow: active ? "0 0 10px #10b981" : "none",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "12px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#f4f4f5",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </h3>
            <div style={{ fontSize: "10px", color: "#a1a1aa", fontFamily: "monospace", marginTop: "2px" }}>
              <span>{participants.length} connecté(s)</span>
              {activeSpeakersCount > 0 && (
                <span style={{ color: "#34d399", fontWeight: 600, marginLeft: "6px" }}>
                  • {activeSpeakersCount} direct
                </span>
              )}
            </div>
          </div>
        </div>

        {collapsible && (
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a1a1aa",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#a1a1aa";
            }}
            title="Réduire en icônes flottantes (Discord)"
          >
            <svg style={{ width: "16px", height: "16px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Action Bar (Side-by-Side Mic & Deafen Buttons) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px",
          backgroundColor: "rgba(15, 16, 18, 0.4)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Mic Toggle Button */}
        <button
          onClick={toggleMic}
          disabled={lockMuted}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "11px",
            border: selfMuted || serverMuted || lockMuted
              ? "1px solid rgba(244, 63, 94, 0.35)"
              : "1px solid rgba(16, 185, 129, 0.4)",
            backgroundColor: selfMuted || serverMuted || lockMuted
              ? "rgba(244, 63, 94, 0.12)"
              : "rgba(16, 185, 129, 0.15)",
            color: selfMuted || serverMuted || lockMuted ? "#fda4af" : "#6ee7b7",
            boxShadow: selfMuted || serverMuted || lockMuted
              ? "none"
              : "0 0 12px rgba(16, 185, 129, 0.2)",
            cursor: lockMuted ? "not-allowed" : "pointer",
            opacity: lockMuted ? 0.6 : 1,
            transition: "all 0.15s ease-in-out",
          }}
        >
          {selfMuted || serverMuted || lockMuted ? (
            <>
              <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
              <span>{lockMuted ? "Verrouillé" : "Muter"}</span>
            </>
          ) : (
            <>
              <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Actif</span>
            </>
          )}
        </button>

        {/* Deafen Button */}
        <button
          onClick={toggleDeafen}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "11px",
            border: deafened
              ? "1px solid rgba(168, 85, 247, 0.4)"
              : "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: deafened
              ? "rgba(168, 85, 247, 0.15)"
              : "rgba(255, 255, 255, 0.05)",
            color: deafened ? "#c084fc" : "#d4d4d8",
            cursor: "pointer",
            transition: "all 0.15s ease-in-out",
          }}
        >
          <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1a2 2 0 002-2v-3a2 2 0 00-2-2H4a1 1 0 00-1 1v3zm18 0a3 3 0 01-3 3h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3a1 1 0 011 1v3z" />
            {deafened && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />}
          </svg>
          <span>{deafened ? "Sourdine" : "Casque"}</span>
        </button>
      </div>

      {/* Audio Device Selector Dropdown */}
      {availableDevices.length > 0 && (
        <div style={{ padding: "0 10px 8px 10px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <select
            value={selectedDeviceId}
            onChange={(e) => switchAudioDevice(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px",
              borderRadius: "8px",
              backgroundColor: "rgba(10, 10, 12, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#a1a1aa",
              fontSize: "10px",
              fontFamily: "sans-serif",
              outline: "none",
              cursor: "pointer",
            }}
            title="Choisir le microphone"
          >
            {availableDevices.map((dev) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                🎙️ {dev.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Participant List (260px Vertical Card List) */}
      <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
        {participants.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: "11px", color: "#71717a", fontFamily: "monospace" }}>
            Aucun participant connecté
          </div>
        ) : (
          participants.map((p) => {
            const isSelf = p.peerId === myPeerId;
            const localMuted = isLocalMuted(p.peerId);
            const vol = getLocalVolume(p.peerId);
            const showVol = showVolumeFor === p.peerId;

            return (
              <div
                key={p.peerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(30, 31, 35, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                {/* Voice Bubble Component */}
                <VoiceBubble participant={p} isSelf={isSelf} isHost={p.peerId === peerManager?.hostPeerId} />

                {/* Right Controls for Self / Other Participants */}
                {isSelf ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {/* Self Input Volume Slider Toggle */}
                    {showVol ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#09090b", padding: "2px 6px", borderRadius: "6px", border: "1px solid #27272a" }}>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#6ee7b7", width: "28px", textAlign: "right" }}>
                          {Math.round(inputVolume * 100)}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.05"
                          value={inputVolume}
                          onChange={(e) => setInputVolume(parseFloat(e.target.value))}
                          style={{ width: "40px", height: "4px", accentColor: "#10b981", cursor: "pointer" }}
                        />
                        <button
                          onClick={() => setShowVolumeFor(null)}
                          style={{ fontSize: "9px", color: "#71717a", background: "none", border: "none", cursor: "pointer", marginLeft: "2px" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowVolumeFor(p.peerId)}
                        style={{ padding: "3px 6px", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "9px", fontFamily: "monospace", color: "#6ee7b7", cursor: "pointer" }}
                        title="Ajuster le volume d'entrée de mon micro"
                      >
                        🎙️ {Math.round(inputVolume * 100)}%
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {/* Volume popover toggle */}
                    {showVol ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#09090b", padding: "2px 6px", borderRadius: "6px", border: "1px solid #27272a" }}>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#a1a1aa", width: "24px", textAlign: "right" }}>
                          {Math.round(vol * 100)}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={vol}
                          onChange={(e) => setLocalVolume(p.peerId, parseFloat(e.target.value))}
                          style={{ width: "40px", height: "4px", accentColor: "#10b981", cursor: "pointer" }}
                        />
                        <button
                          onClick={() => setShowVolumeFor(null)}
                          style={{ fontSize: "9px", color: "#71717a", background: "none", border: "none", cursor: "pointer", marginLeft: "2px" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowVolumeFor(p.peerId)}
                        style={{ padding: "3px 6px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "9px", fontFamily: "monospace", color: "#d4d4d8", cursor: "pointer" }}
                        title="Ajuster le volume"
                      >
                        {Math.round(vol * 100)}%
                      </button>
                    )}

                    {/* Local Mute Button */}
                    <button
                      onClick={() => toggleLocalMute(p.peerId)}
                      style={{
                        padding: "4px 6px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        border: localMuted ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: localMuted ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.06)",
                        color: localMuted ? "#fda4af" : "#a1a1aa",
                        cursor: "pointer",
                      }}
                      title={localMuted ? "Rétablir le son" : "Muter pour moi"}
                    >
                      {localMuted ? "🔇" : "🔊"}
                    </button>

                    {/* Host Moderation Tools */}
                    {isHost && (
                      <div style={{ display: "flex", alignItems: "center", gap: "2px", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "4px" }}>
                        <button
                          onClick={() => serverMute(p.peerId, !p.serverMuted)}
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            border: p.serverMuted ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                            backgroundColor: p.serverMuted ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.06)",
                            color: p.serverMuted ? "#fda4af" : "#a1a1aa",
                            cursor: "pointer",
                          }}
                          title={p.serverMuted ? "Démuter globalement" : "Muter globalement"}
                        >
                          🚫
                        </button>

                        <button
                          onClick={() => lockMute(p.peerId, !p.lockMuted)}
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            border: p.lockMuted ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                            backgroundColor: p.lockMuted ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.06)",
                            color: p.lockMuted ? "#fcd34d" : "#a1a1aa",
                            cursor: "pointer",
                          }}
                          title={p.lockMuted ? "Déverrouiller micro" : "Verrouiller micro"}
                        >
                          🔒
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
