import React, { useState, useRef, useEffect } from "react";
import type { TextChatPanelProps } from "./types";

export const TextChatPanel: React.FC<TextChatPanelProps> = ({
  messages,
  onSend,
  title = "Chat Salon",
  placeholder = "Écrire un message...",
  emptyLabel = "Aucun message pour le moment.",
  className = "",
  style = {},
  maxHeight = "280px",
}) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;
    onSend(cleanText);
    setText("");
  };

  return (
    <div
      className={className || "flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-zinc-100 text-sm"}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: className ? undefined : "rgba(24, 24, 27, 0.8)",
        border: className ? undefined : "1px solid #27272a",
        borderRadius: className ? undefined : "16px",
        padding: className ? undefined : "16px",
        color: className ? undefined : "#f4f4f5",
        fontSize: className ? undefined : "14px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {title && (
        <div
          className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2"
          style={{
            fontWeight: 700,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: className ? undefined : "#a1a1aa",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>💬</span>
          <span>{title}</span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1"
        style={{
          flex: 1,
          maxHeight: maxHeight,
          overflowY: "auto",
          marginBottom: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {messages.length === 0 ? (
          <div
            className="text-xs text-zinc-500 italic text-center py-4"
            style={{ fontSize: "12px", color: className ? undefined : "#71717a", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}
          >
            {emptyLabel}
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/40 text-xs"
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                backgroundColor: className ? undefined : "rgba(9, 9, 11, 0.6)",
                border: className ? undefined : "1px solid rgba(39, 39, 42, 0.4)",
                fontSize: "12px",
              }}
            >
              <div
                className="flex items-center justify-between gap-2 mb-1"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" }}
              >
                <span className="font-bold text-violet-300 truncate" style={{ fontWeight: 700, color: className ? undefined : "#c4b5fd" }}>
                  {msg.sender}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono" style={{ fontSize: "10px", color: className ? undefined : "#71717a", fontFamily: "monospace" }}>
                  {msg.time}
                </span>
              </div>
              <p className="text-zinc-200 break-words margin-0" style={{ color: className ? undefined : "#e4e4e7", margin: 0, wordBreak: "break-word" }}>
                {msg.text}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2" style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
          style={{
            flex: 1,
            backgroundColor: className ? undefined : "#09090b",
            border: className ? undefined : "1px solid #27272a",
            borderRadius: "12px",
            padding: "8px 12px",
            fontSize: "12px",
            color: className ? undefined : "#f4f4f5",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all"
          style={{
            padding: "8px 16px",
            backgroundColor: className ? undefined : "#7c3aed",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "12px",
            borderRadius: "12px",
            border: "none",
            cursor: !text.trim() ? "not-allowed" : "pointer",
            opacity: !text.trim() ? 0.4 : 1,
          }}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
};
