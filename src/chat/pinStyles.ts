import type { CSSProperties } from "react";
import type { PanelScrollbarAccent } from "./scrollbarStyles";

/** Tailwind classes for the scroll-lock pin when active, per game accent. */
export const PIN_LOCKED_CLASSES: Record<PanelScrollbarAccent, string> = {
  amber: "border-amber-500/40 bg-amber-950/40 text-amber-300",
  rose: "border-rose-500/40 bg-rose-950/40 text-rose-300",
  violet: "border-violet-500/40 bg-violet-950/40 text-violet-300",
  emerald: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300",
  zinc: "border-zinc-500/40 bg-zinc-800/60 text-zinc-300",
};

export const PIN_IDLE_CLASS =
  "border-current/15 bg-black/20 text-current/60 hover:bg-black/30 hover:text-current";

export function pinLockedClass(accent: PanelScrollbarAccent = "zinc"): string {
  return PIN_LOCKED_CLASSES[accent] ?? PIN_LOCKED_CLASSES.zinc;
}

/** Re-export for callers that only need accent typing. */
export type { PanelScrollbarAccent };

/** Avoid unused import warnings if used only as types elsewhere. */
export type ScrollAccentStyle = CSSProperties;
