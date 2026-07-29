import React, { useRef, useEffect, useState, useCallback } from "react";
import { Pin, PinOff } from "lucide-react";
import type { JournalPanelProps } from "./types";
import { cn } from "../ui/utils";
import { P2PLAY_PANEL_SCROLLBAR_CSS, scrollbarAccentStyle } from "./scrollbarStyles";
import { PIN_IDLE_CLASS, pinLockedClass } from "./pinStyles";
import { journalTypeClassesForAccent } from "./journalEventStyles";

/** Newest-first journals: stick to top unless the reader locks / scrolls away. */
const NEAR_TOP_PX = 48;

export const JournalPanel: React.FC<JournalPanelProps> = ({
  entries,
  title = "Journal de Bord",
  emptyLabel = "Aucun événement enregistré.",
  className = "",
  style = {},
  maxHeight = "280px",
  typeClassNames = {},
  scrollbarAccent = "zinc",
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const prevCountRef = useRef(entries.length);
  const accentTypeClasses = journalTypeClassesForAccent(scrollbarAccent);

  const scrollToNewest = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = entries.length;
    if (entries.length <= prev) return;
    if (scrollLocked) return;
    scrollToNewest();
  }, [entries, scrollLocked, scrollToNewest]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const awayFromTop = el.scrollTop > NEAR_TOP_PX;
    if (awayFromTop && !scrollLocked) {
      setScrollLocked(true);
    } else if (!awayFromTop && scrollLocked) {
      setScrollLocked(false);
    }
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
            <span aria-hidden>📜</span>
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
              ? "Déverrouiller le scroll (suivre les nouveaux événements)"
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
        className="p2play-panel-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5 font-mono text-xs"
        style={{ maxHeight, ...scrollbarAccentStyle(scrollbarAccent) }}
      >
        {entries.length === 0 ? (
          <p className="py-4 text-center text-xs italic opacity-50">{emptyLabel}</p>
        ) : (
          entries.map((entry) => {
            const typeStyleClass =
              typeClassNames[entry.type] ||
              accentTypeClasses[entry.type] ||
              accentTypeClasses.info;
            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-2",
                  typeStyleClass,
                )}
              >
                <span className="shrink-0 text-[10px] opacity-60">{entry.timestamp}</span>
                <span className="min-w-0 flex-1 break-words">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>

      <style>{P2PLAY_PANEL_SCROLLBAR_CSS}</style>
    </div>
  );
};
