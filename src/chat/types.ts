import type { CSSProperties } from "react";
import type { ChatMessage } from "../peer/types";
import type { PeerManagerLike } from "../peer/PeerManagerLike";

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
}

export interface JournalPanelProps {
  entries: JournalEntry[];
  title?: string;
  emptyLabel?: string;
  className?: string;
  style?: CSSProperties;
  maxHeight?: string;
  typeClassNames?: Record<string, string>;
}

export type ChatHistorySyncMessage = {
  type: "CHAT_HISTORY_SYNC";
  messages: ChatMessage[];
};
