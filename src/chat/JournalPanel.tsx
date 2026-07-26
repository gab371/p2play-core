import React, { useRef, useEffect } from "react";
import type { JournalPanelProps } from "./types";

const DEFAULT_TYPE_CLASSES: Record<string, string> = {
  info: "text-zinc-400 border-zinc-800 bg-zinc-950/40",
  system: "text-violet-400 border-violet-900/40 bg-violet-950/20",
  warning: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  error: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  success: "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  phase: "text-fuchsia-400 border-fuchsia-900/40 bg-fuchsia-950/20 font-bold",
  action: "text-sky-400 border-sky-900/40 bg-sky-950/20",
  shot: "text-sky-400 border-sky-900/40 bg-sky-950/20",
  pocket: "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  foul: "text-rose-400 border-rose-900/40 bg-rose-950/20 font-bold",
  failure: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  victory: "text-amber-300 border-amber-900/40 bg-amber-950/20 font-bold",
  challenge: "text-rose-300 border-rose-900/40 bg-rose-950/20",
  block: "text-orange-300 border-orange-900/40 bg-orange-950/20",
  loss: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  sheriff: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  declaration: "text-sky-300 border-sky-900/40 bg-sky-950/20",
  bribe: "text-amber-300 border-amber-900/40 bg-amber-950/20",
  pass: "text-zinc-400 border-zinc-800 bg-zinc-950/40",
  "inspection-honest": "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  "inspection-liar": "text-rose-400 border-rose-900/40 bg-rose-950/20",
};

export const JournalPanel: React.FC<JournalPanelProps> = ({
  entries,
  title = "Journal de Bord",
  emptyLabel = "Aucun événement enregistré.",
  className = "",
  style = {},
  maxHeight = "280px",
  typeClassNames = {},
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

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
          <span>📜</span>
          <span>{title}</span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs"
        style={{
          flex: 1,
          maxHeight: maxHeight,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        {entries.length === 0 ? (
          <div
            className="text-xs text-zinc-500 italic text-center py-4"
            style={{ fontSize: "12px", color: className ? undefined : "#71717a", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}
          >
            {emptyLabel}
          </div>
        ) : (
          entries.map((entry) => {
            const typeStyleClass = typeClassNames[entry.type] || DEFAULT_TYPE_CLASSES[entry.type] || DEFAULT_TYPE_CLASSES.info;
            return (
              <div
                key={entry.id}
                className={`p-2 rounded-xl border flex items-start gap-2 ${typeStyleClass}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(63, 63, 70, 0.4)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <span className="text-[10px] text-zinc-500 flex-shrink-0" style={{ fontSize: "10px", color: "#71717a", flexShrink: 0 }}>
                  {entry.timestamp}
                </span>
                <span className="flex-1 break-words margin-0" style={{ flex: 1, wordBreak: "break-word", margin: 0 }}>
                  {entry.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
