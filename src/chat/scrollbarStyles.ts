import type { CSSProperties } from "react";

/** Named accents for chat/journal scrollbars — games pick their brand color. */
export type PanelScrollbarAccent = "amber" | "rose" | "violet" | "emerald" | "zinc";

const PRESETS: Record<
  PanelScrollbarAccent,
  { thumb: string; thumbHover: string; track: string }
> = {
  amber: {
    thumb: "rgba(245, 158, 11, 0.45)",
    thumbHover: "rgba(245, 158, 11, 0.75)",
    track: "rgba(0, 0, 0, 0.25)",
  },
  rose: {
    thumb: "rgba(244, 63, 94, 0.45)",
    thumbHover: "rgba(244, 63, 94, 0.75)",
    track: "rgba(0, 0, 0, 0.25)",
  },
  violet: {
    thumb: "rgba(139, 92, 246, 0.5)",
    thumbHover: "rgba(139, 92, 246, 0.8)",
    track: "rgba(0, 0, 0, 0.25)",
  },
  emerald: {
    thumb: "rgba(16, 185, 129, 0.45)",
    thumbHover: "rgba(16, 185, 129, 0.75)",
    track: "rgba(0, 0, 0, 0.25)",
  },
  zinc: {
    thumb: "rgba(161, 161, 170, 0.45)",
    thumbHover: "rgba(161, 161, 170, 0.7)",
    track: "rgba(0, 0, 0, 0.25)",
  },
};

export function scrollbarAccentStyle(
  accent: PanelScrollbarAccent = "zinc",
): CSSProperties {
  const p = PRESETS[accent] ?? PRESETS.zinc;
  return {
    ["--p2play-scroll-thumb" as string]: p.thumb,
    ["--p2play-scroll-thumb-hover" as string]: p.thumbHover,
    ["--p2play-scroll-track" as string]: p.track,
  };
}

/** Shared thin scrollbar; colors come from CSS vars set per game. */
export const P2PLAY_PANEL_SCROLLBAR_CSS = `
  .p2play-panel-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--p2play-scroll-thumb, rgba(161, 161, 170, 0.45))
      var(--p2play-scroll-track, rgba(0, 0, 0, 0.25));
  }
  .p2play-panel-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .p2play-panel-scroll::-webkit-scrollbar-track {
    background: var(--p2play-scroll-track, rgba(0, 0, 0, 0.25));
    border-radius: 999px;
  }
  .p2play-panel-scroll::-webkit-scrollbar-thumb {
    background: var(--p2play-scroll-thumb, rgba(161, 161, 170, 0.45));
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  .p2play-panel-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--p2play-scroll-thumb-hover, rgba(161, 161, 170, 0.7));
    background-clip: padding-box;
    border: 2px solid transparent;
  }
`;
