import React, { useState, useEffect, useRef } from "react";
import { clearRoomUrlFromAddressBar, extractRoomCodeFromUrl, subscribeRoomUrlChanges } from "../url";
import { loadSession } from "../session/helpers";

export interface P2PlayLobbyTheme {
  primaryColor: string;
  primaryHover: string;
  titleGradient: string;
  borderColor: string;
  focusBorderColor: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  subTextColor: string;
  inputBg: string;
  fontFamily?: string;
  joinButtonBg?: string;
  joinButtonText?: string;
}

export interface P2PlayLobbyClasses {
  root?: string;
  header?: string;
  emoji?: string;
  title?: string;
  subtitle?: string;
  error?: string;
  content?: string;
  inputGroup?: string;
  labelWrapper?: string;
  label?: string;
  input?: string;
  avatarWrapper?: string;
  avatarGrid?: string;
  avatarItem?: string;
  avatarItemSelected?: string;
  hr?: string;
  actionGroup?: string;
  createButton?: string;
  divider?: string;
  dividerLine?: string;
  dividerText?: string;
  joinWrapper?: string;
  joinGroup?: string;
  joinInput?: string;
  joinButton?: string;
  urlNotice?: string;
}

export const LOBBY_THEMES: Record<string, P2PlayLobbyTheme> = {
  violet: {
    primaryColor: "#7c3aed",
    primaryHover: "#6d28d9",
    titleGradient: "linear-gradient(to right, #8b5cf6, #d946ef)",
    borderColor: "#27272a",
    focusBorderColor: "#8b5cf6",
    cardBg: "rgba(24, 24, 27, 0.6)",
    badgeBg: "rgba(88, 28, 135, 0.8)",
    badgeText: "#ddd6fe",
    textColor: "#f4f4f5",
    subTextColor: "#a1a1aa",
    inputBg: "#09090b",
    joinButtonBg: "#27272a",
    joinButtonText: "#f4f4f5",
  },
  amber: {
    primaryColor: "#e5a93b",
    primaryHover: "#f6bd4f",
    titleGradient: "linear-gradient(to right, rgb(251, 191, 36), rgb(252, 211, 77))",
    borderColor: "rgba(82, 54, 40, 0.6)",
    focusBorderColor: "#e5a93b",
    cardBg: "rgba(45, 27, 16, 0.6)",
    badgeBg: "rgba(245, 158, 11, 0.2)",
    badgeText: "#fef3c7",
    textColor: "#fffbeb",
    subTextColor: "rgba(251, 191, 36, 0.6)",
    inputBg: "#1c0f08",
    fontFamily: "Cinzel, ui-sans-serif, system-ui, sans-serif",
    joinButtonBg: "#3b251b",
    joinButtonText: "#e5a93b",
  },
  emerald: {
    primaryColor: "#059669",
    primaryHover: "#047857",
    titleGradient: "linear-gradient(to right, #34d399, #2dd4bf)",
    borderColor: "#27272a",
    focusBorderColor: "#10b981",
    cardBg: "rgba(6, 78, 59, 0.3)",
    badgeBg: "rgba(6, 95, 70, 0.8)",
    badgeText: "#a7f3d0",
    textColor: "#f4f4f5",
    subTextColor: "#a1a1aa",
    inputBg: "#09090b",
  },
  red: {
    primaryColor: "#e11d48",
    primaryHover: "#be123c",
    titleGradient: "linear-gradient(to right, #f43f5e, #f87171)",
    borderColor: "rgba(136, 19, 55, 0.6)",
    focusBorderColor: "#f43f5e",
    cardBg: "rgba(76, 5, 25, 0.3)",
    badgeBg: "rgba(136, 19, 55, 0.8)",
    badgeText: "#fecdd3",
    textColor: "#fff1f2",
    subTextColor: "rgba(253, 164, 175, 0.6)",
    inputBg: "#1c0f08",
  },
};

export interface P2PlayLobbyProps {
  title?: string;
  subtitle?: string;
  bannerEmoji?: string;
  avatars?: string[];
  theme?: 'violet' | 'amber' | 'emerald' | 'red' | P2PlayLobbyTheme;
  status?: string;
  error?: string | null;
  maxUsernameLength?: number;
  showVoiceToggle?: boolean;
  showCharacterCounter?: boolean;
  labelAlign?: 'center' | 'left';
  defaultUsername?: string;
  defaultAvatar?: string;

  // Custom Labels & Texts
  usernameLabel?: string;
  usernamePlaceholder?: string;
  avatarLabel?: string;
  createButtonText?: string;
  joinCodeLabel?: string;
  joinCodePlaceholder?: string;
  joinButtonText?: string;
  compactHostSection?: boolean;
  joinLayout?: 'stacked' | 'side-by-side';
  /** When true, the header emoji follows the currently selected avatar. */
  bannerFollowsAvatar?: boolean;
  /** Default: uppercase. Use "none" to keep subtitle casing as provided. */
  subtitleTransform?: 'uppercase' | 'none';

  // MUI / Shadcn Style Customization
  classes?: P2PlayLobbyClasses;

  onCreateRoom?: (roomCode: string, username: string, avatar: string, enableVoice: boolean) => void;
  onJoinRoom?: (roomCode: string, username: string, avatar: string) => void;
  onHost?: (username: string, avatar: string) => void;
  onJoin?: (username: string, avatar: string, roomCode: string) => void;
  renderAvatarSelector?: (props: {
    avatars: string[];
    selectedAvatar: string;
    onSelectAvatar: (avatar: string) => void;
  }) => React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_AVATARS = ["👑", "🤠", "🧙‍♂️", "👨‍🍳", "👰‍♀️", "🤵‍♂️", "🌵", "🐎"];

export const P2PlayLobby: React.FC<P2PlayLobbyProps> = ({
  title = "P2PLAY",
  subtitle = "Votre Hub de Jeux de Société P2P Sans Serveur",
  bannerEmoji = "👑",
  avatars = DEFAULT_AVATARS,
  theme = "violet",
  status = "IDLE",
  error = null,
  maxUsernameLength = 15,
  showVoiceToggle = true,
  showCharacterCounter = true,
  labelAlign = "left",
  defaultUsername,
  defaultAvatar,
  usernameLabel = "Votre Pseudo",
  usernamePlaceholder = "Entrez votre pseudo...",
  avatarLabel = "Choisir un Avatar",
  createButtonText = "Créer un salon",
  joinCodeLabel = "Saisir le code du salon",
  joinCodePlaceholder = "CODE DU SALON...",
  joinButtonText = "Rejoindre un salon",
  compactHostSection = false,
  joinLayout = "stacked",
  bannerFollowsAvatar = false,
  subtitleTransform = "uppercase",
  classes = {},
  onCreateRoom,
  onJoinRoom,
  onHost,
  onJoin,
  renderAvatarSelector,
  children,
  className = "",
  style = {},
}) => {
  const roomFromUrl = extractRoomCodeFromUrl();
  const sessionFromUrl = roomFromUrl ? loadSession(roomFromUrl) : null;

  const [username, setUsername] = useState(
    () =>
      sessionFromUrl?.username ||
      defaultUsername ||
      `Joueur_${Math.floor(Math.random() * 1000)}`,
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => sessionFromUrl?.avatar || defaultAvatar || avatars[0] || "👑",
  );
  const displayBannerEmoji = bannerFollowsAvatar ? selectedAvatar : bannerEmoji;
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState(() => extractRoomCodeFromUrl() || "");
  const [enableVoice, setEnableVoice] = useState(true);
  const urlInvitationRef = useRef<string | null>(null);

  useEffect(() => {
    const syncFromUrl = (code: string | null) => {
      if (code) {
        urlInvitationRef.current = code;
        setDetectedCode(code);
        setJoinCode(code);
        const session = loadSession(code);
        if (session?.username) setUsername(session.username);
        if (session?.avatar) setSelectedAvatar(session.avatar);
        return;
      }
      if (urlInvitationRef.current) {
        urlInvitationRef.current = null;
        setDetectedCode(null);
        setJoinCode("");
      }
    };

    syncFromUrl(extractRoomCodeFromUrl());
    return subscribeRoomUrlChanges(syncFromUrl);
  }, []);

  const activeTheme: P2PlayLobbyTheme = typeof theme === "string" ? LOBBY_THEMES[theme] || LOBBY_THEMES.violet : theme;

  const handleCreate = () => {
    const cleanName = username.trim().slice(0, maxUsernameLength);
    if (!cleanName) return;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomCode = "";
    for (let i = 0; i < 6; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (onCreateRoom) {
      onCreateRoom(randomCode, cleanName, selectedAvatar, enableVoice);
    } else if (onHost) {
      onHost(cleanName, selectedAvatar);
    }
  };

  const handleJoin = () => {
    const cleanName = username.trim().slice(0, maxUsernameLength);
    const targetCode = (detectedCode || joinCode).trim().toUpperCase();
    if (targetCode && cleanName) {
      if (onJoinRoom) {
        onJoinRoom(targetCode, cleanName, selectedAvatar);
      } else if (onJoin) {
        onJoin(cleanName, selectedAvatar, targetCode);
      }
    }
  };

  const handleClearUrlCode = () => {
    urlInvitationRef.current = null;
    setDetectedCode(null);
    setJoinCode("");
    clearRoomUrlFromAddressBar();
  };

  const isLoading = status === "CONNECTING";
  const isJoinDisabled = isLoading || !joinCode.trim() || !username.trim();
  const isCreateDisabled = isLoading || !username.trim();
  const hasCustomClasses = Boolean(classes.root || className);

  return (
    <div
      className={classes.root || className || "w-full max-w-md mx-auto p-8 rounded-3xl shadow-2xl relative overflow-hidden"}
      style={{
        ...(!hasCustomClasses
          ? {
              width: "100%",
              maxWidth: "448px",
              margin: "0 auto",
              padding: "32px",
              backgroundColor: activeTheme.cardBg,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${activeTheme.borderColor}`,
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
              overflow: "hidden",
              textAlign: "center",
              color: activeTheme.textColor,
              fontFamily: activeTheme.fontFamily || "inherit",
              boxSizing: "border-box",
            }
          : {}),
        ...style,
      }}
    >
      <div className={classes.header} style={!classes.header ? { textAlign: "center", marginBottom: "32px" } : {}}>
        <span
          className={classes.emoji || "animate-bounce"}
          style={!classes.emoji ? { fontSize: "48px", display: "inline-block", marginBottom: "12px" } : {}}
        >
          {displayBannerEmoji}
        </span>
        <h1
          className={classes.title}
          style={
            !classes.title
              ? {
                  fontSize: "36px",
                  fontWeight: 800,
                  background: activeTheme.titleGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.025em",
                  margin: "0 0 8px 0",
                  whiteSpace: "nowrap",
                  fontFamily: activeTheme.fontFamily || "inherit",
                }
              : {}
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={classes.subtitle}
            style={
              !classes.subtitle
                ? {
                    color: activeTheme.subTextColor,
                    fontSize: "12px",
                    textTransform: subtitleTransform,
                    letterSpacing: subtitleTransform === "uppercase" ? "1.2px" : "normal",
                    margin: "8px 0 0 0",
                    fontWeight: 600,
                    fontFamily: activeTheme.fontFamily || "inherit",
                  }
                : {}
            }
          >
            {subtitle}
          </p>
        )}
      </div>

      {error && (
        <div
          className={classes.error}
          style={
            !classes.error
              ? {
                  backgroundColor: "rgba(69, 10, 10, 0.7)",
                  border: "1px solid #7f1d1d",
                  color: "#fecaca",
                  borderRadius: "16px",
                  padding: "12px",
                  marginBottom: "24px",
                  fontSize: "14px",
                  fontWeight: 600,
                }
              : {}
          }
        >
          {error}
        </div>
      )}

      <div className={classes.content} style={!classes.content ? { display: "flex", flexDirection: "column", gap: "24px" } : {}}>
        {/* Username field */}
        <div className={classes.inputGroup} style={!classes.inputGroup ? { textAlign: labelAlign } : {}}>
          <div
            className={classes.labelWrapper}
            style={
              !classes.labelWrapper
                ? {
                    display: "flex",
                    justifyContent: showCharacterCounter ? "space-between" : labelAlign === "center" ? "center" : "flex-start",
                    alignItems: "center",
                    marginBottom: "8px",
                  }
                : {}
            }
          >
            <label
              className={classes.label}
              style={
                !classes.label
                  ? {
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1.2px",
                      color: activeTheme.subTextColor,
                      textAlign: labelAlign,
                      width: labelAlign === "center" && !showCharacterCounter ? "100%" : "auto",
                    }
                  : {}
              }
            >
              {usernameLabel}
            </label>
            {showCharacterCounter && (
              <span style={{ fontSize: "10px", color: activeTheme.subTextColor, fontFamily: "monospace", opacity: 0.7 }}>
                {username.length}/{maxUsernameLength}
              </span>
            )}
          </div>
          <input
            type="text"
            className={classes.input}
            placeholder={usernamePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, maxUsernameLength))}
            maxLength={maxUsernameLength}
            disabled={isLoading}
            style={
              !classes.input
                ? {
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    backgroundColor: activeTheme.inputBg,
                    border: `1px solid ${activeTheme.borderColor}`,
                    color: activeTheme.textColor,
                    outline: "none",
                    textAlign: labelAlign === "center" ? "center" : "left",
                    fontWeight: 700,
                    boxSizing: "border-box",
                    fontSize: "14px",
                    fontFamily: activeTheme.fontFamily || "inherit",
                  }
                : {}
            }
          />
        </div>

        {/* Avatar selector */}
        {renderAvatarSelector ? (
          renderAvatarSelector({ avatars, selectedAvatar, onSelectAvatar: setSelectedAvatar })
        ) : (
          avatars.length > 0 && (
            <div className={classes.avatarWrapper} style={!classes.avatarWrapper ? { textAlign: labelAlign } : {}}>
              <label
                className={classes.label}
                style={
                  !classes.label
                    ? {
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1.2px",
                        color: activeTheme.subTextColor,
                        marginBottom: "8px",
                        textAlign: labelAlign,
                        width: labelAlign === "center" ? "100%" : "auto",
                      }
                    : {}
                }
              >
                {avatarLabel}
              </label>
              <div
                className={classes.avatarGrid}
                style={
                  !classes.avatarGrid
                    ? {
                        display: "grid",
                        gridTemplateColumns: `repeat(${Math.min(avatars.length, 8)}, minmax(0, 1fr))`,
                        gap: "8px",
                        backgroundColor: activeTheme.inputBg,
                        padding: "10px",
                        borderRadius: "16px",
                        border: `1px solid ${activeTheme.borderColor}`,
                      }
                    : {}
                }
              >
                {avatars.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    disabled={isLoading}
                    className={selectedAvatar === av ? classes.avatarItemSelected || classes.avatarItem : classes.avatarItem}
                    style={
                      !classes.avatarItem
                        ? {
                            fontSize: "24px",
                            padding: "6px",
                            borderRadius: "12px",
                            border: selectedAvatar === av ? `1px solid ${activeTheme.primaryColor}` : "none",
                            backgroundColor: selectedAvatar === av ? "rgba(245, 158, 11, 0.2)" : "transparent",
                            transform: selectedAvatar === av ? "scale(1.1)" : "scale(1)",
                            transition: "all 0.15s ease",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            aspectRatio: "1/1",
                          }
                        : {}
                    }
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Extra Children */}
        {children}

        {/* Divider HR */}
        {classes.hr ? (
          <hr className={classes.hr} />
        ) : (
          <div style={{ borderTop: `1px solid ${activeTheme.borderColor}`, margin: "8px 0" }}></div>
        )}

        {/* Direct URL Invitation Mode vs Normal Home Mode */}
        {detectedCode ? (
          <div
            className={classes.urlNotice}
            style={
              !classes.urlNotice
                ? {
                    padding: "20px",
                    backgroundColor: activeTheme.inputBg,
                    border: `1px solid ${activeTheme.borderColor}`,
                    borderRadius: "16px",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }
                : {}
            }
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: activeTheme.badgeText,
                  fontFamily: activeTheme.fontFamily || "inherit",
                }}
              >
                <span>🔗</span> Invitation au Salon
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 900,
                  fontSize: "14px",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  letterSpacing: "0.1em",
                  backgroundColor: activeTheme.badgeBg,
                  color: activeTheme.badgeText,
                  border: `1px solid ${activeTheme.borderColor}`,
                }}
              >
                {detectedCode}
              </span>
            </div>

            <p
              style={{
                fontSize: "12px",
                color: activeTheme.subTextColor,
                lineHeight: "1.5",
                margin: 0,
                fontFamily: activeTheme.fontFamily || "inherit",
              }}
            >
              Vous avez été invité à rejoindre ce salon. Choisissez votre pseudo et votre avatar ci-dessus puis rejoignez la partie !
            </p>

            <button
              onClick={handleJoin}
              disabled={isCreateDisabled}
              className={`${classes.createButton || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
              style={
                !classes.createButton
                  ? {
                      width: "100%",
                      height: "48px",
                      borderRadius: "16px",
                      backgroundColor: activeTheme.primaryColor,
                      color: "#1c0f08",
                      fontWeight: 700,
                      border: "none",
                      cursor: isCreateDisabled ? "not-allowed" : "pointer",
                      opacity: isCreateDisabled ? 0.4 : 1,
                      fontSize: "14px",
                      fontFamily: activeTheme.fontFamily || "inherit",
                    }
                  : {}
              }
            >
              {isLoading ? "Connexion..." : "Rejoindre le salon"}
            </button>

            <button
              type="button"
              onClick={handleClearUrlCode}
              style={{
                background: "none",
                border: "none",
                color: activeTheme.subTextColor,
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "center",
                padding: "4px",
                fontFamily: activeTheme.fontFamily || "inherit",
              }}
            >
              ← Créer un salon ou entrer un autre code
            </button>
          </div>
        ) : (
          <div className={classes.actionGroup} style={!classes.actionGroup ? { display: "flex", flexDirection: "column", gap: "12px" } : {}}>
            {/* Host section */}
            {compactHostSection ? (
              <button
                onClick={handleCreate}
                disabled={isCreateDisabled}
                className={`${classes.createButton || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                style={
                  !classes.createButton
                    ? {
                        width: "100%",
                        height: "48px",
                        borderRadius: "16px",
                        backgroundColor: activeTheme.primaryColor,
                        color: "#1c0f08",
                        fontWeight: 700,
                        border: "none",
                        cursor: isCreateDisabled ? "not-allowed" : "pointer",
                        opacity: isCreateDisabled ? 0.4 : 1,
                        fontSize: "14px",
                        boxShadow: "rgba(245, 158, 11, 0.1) 0px 4px 6px -1px, rgba(245, 158, 11, 0.1) 0px 2px 4px -2px",
                        fontFamily: activeTheme.fontFamily || "inherit",
                      }
                    : {}
                }
              >
                {isLoading ? "Création..." : createButtonText}
              </button>
            ) : (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(9, 9, 11, 0.4)",
                  border: `1px solid ${activeTheme.borderColor}`,
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <p style={{ fontSize: "12px", color: activeTheme.subTextColor, fontWeight: 600, textAlign: "left", margin: 0 }}>
                  Commencer une nouvelle session en tant qu'Hôte
                </p>

                {/* Voice Chat Toggle Switch */}
                {showVoiceToggle && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      backgroundColor: "#18181b",
                      border: `1px solid ${activeTheme.borderColor}`,
                      borderRadius: "12px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: activeTheme.textColor }}>
                      <span style={{ fontSize: "16px" }}>{enableVoice ? "🎙️" : "🔇"}</span>
                      <div>
                        <div>Activer le Salon Vocal P2P</div>
                        <div style={{ fontSize: "10px", fontWeight: 400, color: "#71717a" }}>
                          {enableVoice ? "Chat vocal intégré actif" : "Désactivé (ex: Discord)"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableVoice(!enableVoice)}
                      style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "9999px",
                        backgroundColor: enableVoice ? activeTheme.primaryColor : "#3f3f46",
                        border: "none",
                        position: "relative",
                        cursor: "pointer",
                        padding: "2px",
                        transition: "background-color 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "9999px",
                          backgroundColor: "#ffffff",
                          transform: enableVoice ? "translateX(20px)" : "translateX(0)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={isCreateDisabled}
                  className={`${classes.createButton || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={
                    !classes.createButton
                      ? {
                          width: "100%",
                          height: "48px",
                          borderRadius: "16px",
                          backgroundColor: activeTheme.primaryColor,
                          color: "#ffffff",
                          fontWeight: 700,
                          border: "none",
                          cursor: isCreateDisabled ? "not-allowed" : "pointer",
                          opacity: isCreateDisabled ? 0.4 : 1,
                          fontSize: "14px",
                          fontFamily: activeTheme.fontFamily || "inherit",
                        }
                      : {}
                  }
                >
                  {isLoading ? "Création..." : createButtonText}
                </button>
              </div>
            )}

            {/* Separator Line with "OU" */}
            <div className={classes.divider} style={!classes.divider ? { position: "relative", display: "flex", alignItems: "center", padding: "8px 0" } : {}}>
              <div className={classes.dividerLine} style={!classes.dividerLine ? { flexGrow: 1, borderTop: `1px solid ${activeTheme.borderColor}` } : {}}></div>
              <span
                className={classes.dividerText}
                style={
                  !classes.dividerText
                    ? {
                        flexShrink: 0,
                        margin: "0 16px",
                        color: activeTheme.subTextColor,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        fontFamily: activeTheme.fontFamily || "inherit",
                      }
                    : {}
                }
              >
                OU
              </span>
              <div className={classes.dividerLine} style={!classes.dividerLine ? { flexGrow: 1, borderTop: `1px solid ${activeTheme.borderColor}` } : {}}></div>
            </div>

            {/* Join room section */}
            <div className={classes.joinWrapper} style={!classes.joinWrapper ? { display: "flex", flexDirection: "column", gap: "8px" } : {}}>
              <div style={{ textAlign: labelAlign }}>
                <label
                  className={classes.label}
                  style={
                    !classes.label
                      ? {
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "1.2px",
                          color: activeTheme.subTextColor,
                          marginBottom: "4px",
                          textAlign: labelAlign,
                          width: labelAlign === "center" ? "100%" : "auto",
                        }
                      : {}
                  }
                >
                  {joinCodeLabel}
                </label>

                {joinLayout === "side-by-side" ? (
                  <div className={classes.joinGroup} style={!classes.joinGroup ? { display: "flex", gap: "8px" } : {}}>
                    <input
                      type="text"
                      className={classes.joinInput}
                      placeholder={joinCodePlaceholder}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      style={
                        !classes.joinInput
                          ? {
                              flex: 1,
                              padding: "8px 12px",
                              height: "40px",
                              borderRadius: "16px",
                              backgroundColor: activeTheme.inputBg,
                              border: `1px solid ${activeTheme.borderColor}`,
                              color: activeTheme.textColor,
                              outline: "none",
                              textAlign: "center",
                              fontWeight: 700,
                              letterSpacing: "1.4px",
                              textTransform: "uppercase",
                              fontFamily: "monospace",
                              boxSizing: "border-box",
                              fontSize: "14px",
                            }
                          : {}
                      }
                    />
                    <button
                      onClick={handleJoin}
                      disabled={isJoinDisabled}
                      className={`${classes.joinButton || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                      style={
                        !classes.joinButton
                          ? {
                              padding: "0 24px",
                              height: "40px",
                              borderRadius: "16px",
                              backgroundColor: activeTheme.joinButtonBg || "#3b251b",
                              color: activeTheme.joinButtonText || activeTheme.primaryColor,
                              fontWeight: 700,
                              border: `1px solid ${activeTheme.borderColor}`,
                              cursor: isJoinDisabled ? "not-allowed" : "pointer",
                              opacity: isJoinDisabled ? 0.4 : 1,
                              fontSize: "14px",
                              whiteSpace: "nowrap",
                              fontFamily: activeTheme.fontFamily || "inherit",
                            }
                          : {}
                      }
                    >
                      {joinButtonText}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className={classes.joinInput}
                    placeholder={joinCodePlaceholder}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    style={
                      !classes.joinInput
                        ? {
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: "16px",
                            backgroundColor: activeTheme.inputBg,
                            border: `1px solid ${activeTheme.borderColor}`,
                            color: activeTheme.textColor,
                            outline: "none",
                            textAlign: "center",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontFamily: "monospace",
                            boxSizing: "border-box",
                            fontSize: "14px",
                          }
                        : {}
                    }
                  />
                )}
              </div>

              {joinLayout === "stacked" && (
                <button
                  onClick={handleJoin}
                  disabled={isJoinDisabled}
                  className={`${classes.joinButton || ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={
                    !classes.joinButton
                      ? {
                          width: "100%",
                          padding: "14px 24px",
                          borderRadius: "16px",
                          backgroundColor: activeTheme.joinButtonBg || "#27272a",
                          color: activeTheme.joinButtonText || "#f4f4f5",
                          fontWeight: 700,
                          border: `1px solid ${activeTheme.borderColor}`,
                          cursor: isJoinDisabled ? "not-allowed" : "pointer",
                          opacity: isJoinDisabled ? 0.4 : 1,
                          fontSize: "14px",
                          fontFamily: activeTheme.fontFamily || "inherit",
                        }
                      : {}
                  }
                >
                  {joinButtonText}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
