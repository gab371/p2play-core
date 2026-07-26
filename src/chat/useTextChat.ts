import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatMessage } from "../peer/types";
import type { UseTextChatOptions, UseTextChatResult } from "./types";

export function appendChatMessage(
  current: ChatMessage[],
  newMessage: ChatMessage,
  maxMessages = 200
): ChatMessage[] {
  const updated = [...current, newMessage];
  if (updated.length > maxMessages) {
    return updated.slice(updated.length - maxMessages);
  }
  return updated;
}

export function useTextChat({
  peerManager,
  externalMessages,
  onMessagesChange,
  maxMessages = 200,
}: UseTextChatOptions): UseTextChatResult {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const externalRef = useRef(externalMessages);
  externalRef.current = externalMessages;
  const onChangeRef = useRef(onMessagesChange);
  onChangeRef.current = onMessagesChange;

  const messages = externalMessages !== undefined ? externalMessages : internalMessages;

  useEffect(() => {
    if (!peerManager) return;

    const previous = peerManager.onChatReceived;
    const handleChat = (msg: ChatMessage) => {
      previous?.(msg);
      if (externalRef.current !== undefined && onChangeRef.current) {
        onChangeRef.current(appendChatMessage(externalRef.current, msg, maxMessages));
      } else {
        setInternalMessages((prev) => appendChatMessage(prev, msg, maxMessages));
      }
    };

    peerManager.onChatReceived = handleChat;

    return () => {
      if (peerManager.onChatReceived === handleChat) {
        peerManager.onChatReceived = previous;
      }
    };
  }, [peerManager, maxMessages]);

  const sendChat = useCallback(
    (senderName: string, text: string) => {
      if (!text.trim() || !peerManager) return;
      peerManager.sendChat(senderName, text.trim());
    },
    [peerManager]
  );

  const clearLocal = useCallback(() => {
    if (externalRef.current !== undefined && onChangeRef.current) {
      onChangeRef.current([]);
    } else {
      setInternalMessages([]);
    }
  }, []);

  return {
    messages,
    sendChat,
    clearLocal,
  };
}
