import type { PanelScrollbarAccent } from "./scrollbarStyles";

/** Neutral fallback shared by every accent (game-specific keys merge on top). */
const BASE: Record<string, string> = {
  info: "text-zinc-400 border-zinc-800 bg-zinc-950/40",
  system: "text-zinc-300 border-zinc-700/50 bg-zinc-900/40",
  warning: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  error: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  success: "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  phase: "text-zinc-200 border-zinc-700/50 bg-zinc-900/50 font-bold",
  action: "text-sky-400 border-sky-900/40 bg-sky-950/20",
  failure: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  victory: "text-amber-300 border-amber-900/40 bg-amber-950/20 font-bold",
  pass: "text-zinc-400 border-zinc-800 bg-zinc-950/40",
};

const AMBER: Record<string, string> = {
  ...BASE,
  system: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  warning: "text-orange-400 border-orange-900/40 bg-orange-950/20",
  phase: "text-amber-300 border-amber-800/50 bg-amber-950/30 font-bold",
  action: "text-sky-300 border-sky-900/40 bg-sky-950/20",
  sheriff: "text-amber-400 border-amber-900/40 bg-amber-950/20",
  declaration: "text-sky-300 border-sky-900/40 bg-sky-950/20",
  bribe: "text-amber-200 border-amber-800/40 bg-amber-950/25",
  "inspection-honest": "text-emerald-400 border-emerald-900/40 bg-emerald-950/20",
  "inspection-liar": "text-rose-400 border-rose-900/40 bg-rose-950/20",
  challenge: "text-rose-300 border-rose-900/40 bg-rose-950/20",
  block: "text-orange-300 border-orange-900/40 bg-orange-950/20",
  loss: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  victory: "text-amber-200 border-amber-800/50 bg-amber-950/30 font-bold",
};

const ROSE: Record<string, string> = {
  ...BASE,
  system: "text-rose-300 border-rose-900/40 bg-rose-950/20",
  warning: "text-pink-300 border-pink-900/40 bg-pink-950/20",
  phase: "text-rose-200 border-rose-800/50 bg-rose-950/30 font-bold",
  action: "text-pink-300 border-pink-900/40 bg-pink-950/20",
  place: "text-rose-300 border-rose-900/40 bg-rose-950/20",
  bid: "text-fuchsia-300 border-fuchsia-900/40 bg-fuchsia-950/20",
  "reveal-rose": "text-rose-300 border-rose-800/50 bg-rose-950/30",
  "reveal-skull": "text-zinc-200 border-zinc-700/50 bg-zinc-900/50",
  success: "text-emerald-300 border-emerald-900/40 bg-emerald-950/20",
  failure: "text-rose-400 border-rose-900/40 bg-rose-950/25",
  elimination: "text-rose-400 border-rose-800/50 bg-rose-950/30 font-bold",
  victory: "text-rose-200 border-rose-800/50 bg-rose-950/30 font-bold",
};

const EMERALD: Record<string, string> = {
  ...BASE,
  system: "text-emerald-300 border-emerald-900/40 bg-emerald-950/20",
  warning: "text-lime-300 border-lime-900/40 bg-lime-950/20",
  phase: "text-teal-300 border-teal-900/40 bg-teal-950/25 font-bold",
  action: "text-cyan-300 border-cyan-900/40 bg-cyan-950/20",
  shot: "text-sky-300 border-sky-900/40 bg-sky-950/20",
  pocket: "text-emerald-300 border-emerald-800/50 bg-emerald-950/30",
  foul: "text-rose-400 border-rose-900/40 bg-rose-950/20 font-bold",
  success: "text-emerald-300 border-emerald-800/50 bg-emerald-950/25",
  failure: "text-rose-400 border-rose-900/40 bg-rose-950/20",
  victory: "text-lime-200 border-lime-800/50 bg-lime-950/25 font-bold",
};

const VIOLET: Record<string, string> = {
  ...BASE,
  system: "text-violet-300 border-violet-900/40 bg-violet-950/20",
  warning: "text-amber-300 border-amber-900/40 bg-amber-950/20",
  phase: "text-fuchsia-300 border-fuchsia-900/40 bg-fuchsia-950/25 font-bold",
  action: "text-sky-300 border-sky-900/40 bg-sky-950/20",
  victory: "text-violet-200 border-violet-800/50 bg-violet-950/30 font-bold",
};

const ZINC: Record<string, string> = {
  ...BASE,
  system: "text-zinc-300 border-zinc-700/50 bg-zinc-900/40",
  phase: "text-zinc-200 border-zinc-700/50 bg-zinc-900/50 font-bold",
};

const BY_ACCENT: Record<PanelScrollbarAccent, Record<string, string>> = {
  amber: AMBER,
  rose: ROSE,
  emerald: EMERALD,
  violet: VIOLET,
  zinc: ZINC,
};

/** Event chip colors for a journal accent (same axis as scrollbar / pin). */
export function journalTypeClassesForAccent(
  accent: PanelScrollbarAccent,
): Record<string, string> {
  return BY_ACCENT[accent] ?? ZINC;
}
