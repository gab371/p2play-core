export interface HubGameManifest {
  /** Hub catalog key — must match games.json key and public/games/{key}/ */
  key: string;
  /** Display name without emoji (emoji is separate). */
  name: string;
  emoji?: string;
  desc: string;
  /** If true, Hub launches into GAME_CONFIG instead of GAME_RUNNING. */
  hasPreConfig: boolean;
  /**
   * Global mount function name on window.
   * Default: `mount` + capitalized key (e.g. skull → mountSkull).
   */
  mountFn?: string;
  /** Game-specific player emotes shown in Hub AvatarSelector (“Émotes du Jeu”). */
  avatars?: string[];
  /**
   * CSS background for Hub mount shell while the game loads
   * (avoids white flash; usually matches the game's body gradient).
   */
  shellBackground?: string;
}

/** Filename each game must ship in its dist / dist.zip for Hub discovery. */
export const HUB_GAME_MANIFEST_FILENAME = "hub-manifest.json";

/**
 * Validates and returns a Hub game declaration.
 * Games typically keep the same object in `public/hub-manifest.json` (copied to dist by Vite).
 */
export function defineHubGameManifest(manifest: HubGameManifest): HubGameManifest {
  if (!manifest.key?.trim()) {
    throw new Error("defineHubGameManifest: key is required");
  }
  if (!manifest.name?.trim()) {
    throw new Error("defineHubGameManifest: name is required");
  }
  if (!manifest.desc?.trim()) {
    throw new Error("defineHubGameManifest: desc is required");
  }
  if (typeof manifest.hasPreConfig !== "boolean") {
    throw new Error("defineHubGameManifest: hasPreConfig must be a boolean");
  }
  if (manifest.avatars !== undefined) {
    if (!Array.isArray(manifest.avatars) || !manifest.avatars.every((a) => typeof a === "string" && a.trim())) {
      throw new Error("defineHubGameManifest: avatars must be a non-empty string array when set");
    }
  }

  const avatars = manifest.avatars?.map((a) => a.trim()).filter(Boolean);

  return {
    key: manifest.key.trim(),
    name: manifest.name.trim(),
    emoji: manifest.emoji?.trim() || undefined,
    desc: manifest.desc.trim(),
    hasPreConfig: manifest.hasPreConfig,
    mountFn: manifest.mountFn?.trim() || undefined,
    avatars: avatars?.length ? avatars : undefined,
    shellBackground: manifest.shellBackground?.trim() || undefined,
  };
}

/** Default window mount function for a catalog key (`skull` → `mountSkull`). */
export function defaultHubMountFnName(key: string): string {
  const cleaned = key.trim();
  if (!cleaned) return "mountGame";
  return `mount${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

/** Label shown in Hub picker cards. */
export function formatHubGameLabel(manifest: HubGameManifest): string {
  return manifest.emoji ? `${manifest.emoji} ${manifest.name}` : manifest.name;
}
