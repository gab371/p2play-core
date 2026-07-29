import React, { useState, useRef, useEffect, useCallback } from "react";
import { Pin, PinOff } from "lucide-react";
import type { TextChatPanelProps } from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";
import { P2PLAY_PANEL_SCROLLBAR_CSS, scrollbarAccentStyle } from "./scrollbarStyles";
import { PIN_IDLE_CLASS, pinLockedClass } from "./pinStyles";

/** Newest-at-bottom chat: stick to bottom unless the reader locks / scrolls up. */
const NEAR_BOTTOM_PX = 48;

export const TextChatPanel: React.FC<TextChatPanelProps> = ({
  messages,
  onSend,
  title = "Chat Salon",
  placeholder = "Écrire un message...",
  emptyLabel = "Aucun message pour le moment.",
  className = "",
  style = {},
  maxHeight = "280px",
  scrollbarAccent = "zinc",
}) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const prevCountRef = useRef(messages.length);

  const scrollToNewest = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (messages.length <= prev) return;
    if (scrollLocked) return;
    scrollToNewest();
  }, [messages, scrollLocked, scrollToNewest]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const awayFromBottom = distFromBottom > NEAR_BOTTOM_PX;
    if (awayFromBottom && !scrollLocked) {
      setScrollLocked(true);
    } else if (!awayFromBottom && scrollLocked) {
      setScrollLocked(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;
    onSend(cleanText);
    setText("");
  };

  return (
    <div
      className={cn(
        !className &&
          "flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-100",
        className,
      )}
      style={style}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        {title ? (
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
            <span aria-hidden>💬</span>
            <span className="truncate">{title}</span>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            setScrollLocked((v) => {
              const next = !v;
              if (!next) queueMicrotask(scrollToNewest);
              return next;
            });
          }}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-xl border transition-colors",
            scrollLocked ? pinLockedClass(scrollbarAccent) : PIN_IDLE_CLASS,
          )}
          title={
            scrollLocked
              ? "Déverrouiller le scroll (suivre les nouveaux messages)"
              : "Verrouiller le scroll (lecture sans saut)"
          }
          aria-pressed={scrollLocked}
          aria-label={scrollLocked ? "Déverrouiller le scroll" : "Verrouiller le scroll"}
        >
          {scrollLocked ? <Pin className="size-3.5" /> : <PinOff className="size-3.5 opacity-70" />}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="p2play-panel-scroll mb-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1.5"
        style={{ maxHeight, ...scrollbarAccentStyle(scrollbarAccent) }}
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs italic opacity-50">{emptyLabel}</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className="rounded-xl border border-current/10 bg-black/20 p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-bold opacity-90">{msg.sender}</span>
                <span className="shrink-0 font-mono text-[10px] opacity-50">{msg.time}</span>
              </div>
              <p className="m-0 break-words opacity-90">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2">
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="h-8 flex-1 rounded-xl border-current/20 bg-black/30 text-xs"
        />
        <Button type="submit" size="sm" disabled={!text.trim()} className="rounded-xl">
          Envoyer
        </Button>
      </form>

      <style>{P2PLAY_PANEL_SCROLLBAR_CSS}</style>
    </div>
  );
};
