import type { CSSProperties } from "react";
import type { ChatMessage } from "../peer/types";
import type { PeerManagerLike } from "../peer/PeerManagerLike";
import type { PanelScrollbarAccent } from "./scrollbarStyles";

export type { PanelScrollbarAccent };

export interface JournalEntry {
  id: string;
  timestamp: string;
  message: string;
  type: string;
}

export interface UseTextChatOptions {
  peerManager: PeerManagerLike | null;
  externalMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  maxMessages?: number;
}

export interface UseTextChatResult {
  messages: ChatMessage[];
  sendChat: (senderName: string, text: string) => void;
  clearLocal: () => void;
}

export interface TextChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  title?: string;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  style?: CSSProperties;
  maxHeight?: string;
  disabled?: boolean;
  disabledNotice?: string;
  /** Scrollbar accent matched to the game theme (default: zinc). */
  scrollbarAccent?: PanelScrollbarAccent;
}

export interface JournalPanelProps {
  entries: JournalEntry[];
  title?: string;
  emptyLabel?: string;
  className?: string;
  style?: CSSProperties;
  maxHeight?: string;
  /** Optional per-type class overrides (merged on top of the accent palette). */
  typeClassNames?: Record<string, string>;
  /**
   * Theme accent shared with scrollbar / pin.
   * Also selects the default event-type color palette for this game (default: zinc).
   */
  scrollbarAccent?: PanelScrollbarAccent;
}

export type ChatHistorySyncMessage = {
  type: "CHAT_HISTORY_SYNC";
  messages: ChatMessage[];
};
