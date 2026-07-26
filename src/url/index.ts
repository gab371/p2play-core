export interface RoomUrlOptions {
  baseUrl?: string;
  useHash?: boolean;
}

/**
 * Generates a full shareable URL for a P2Play room code.
 * Example outputs:
 *  - Hash mode (GitHub Pages safe): https://gab371.github.io/hub-p2play/#/UCMCDE
 *  - Query mode fallback: https://gab371.github.io/hub-p2play/?room=UCMCDE
 */
export function buildRoomUrl(roomCode: string, options: RoomUrlOptions = {}): string {
  const cleanCode = roomCode.trim().toUpperCase();
  const baseUrl = options.baseUrl || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
  const useHash = options.useHash ?? true;

  const sanitizedBase = baseUrl.replace(/\/+$/, "");

  if (useHash) {
    return `${sanitizedBase}/#/${cleanCode}`;
  }
  return `${sanitizedBase}/?room=${cleanCode}`;
}

/**
 * Extracts a room code from the current browser location or given URL string.
 * Supports:
 *  - Hash format: /#/UCMCDE or #UCMCDE
 *  - Query param format: ?room=UCMCDE
 *  - Path trailing segment: /UCMCDE (6 uppercase alphanumeric characters)
 */
export function extractRoomCodeFromUrl(url?: string | Location): string | null {
  if (typeof window === "undefined" && !url) return null;
  const targetUrl = url || window.location;
  const href = typeof targetUrl === "string" ? targetUrl : targetUrl.href;

  try {
    const parsed = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost");

    // 1. Check Query params (?room=CODE, ?code=CODE, ?r=CODE, ?join=CODE)
    for (const key of ["room", "code", "r", "join"]) {
      const val = parsed.searchParams.get(key);
      if (val && /^[A-Z0-9]{4,12}$/i.test(val.trim())) {
        return val.trim().toUpperCase();
      }
    }

    // 2. Check Hash (/#/CODE, #CODE, #/room/CODE, #/room=CODE)
    if (parsed.hash) {
      const hashMatch = parsed.hash.match(/(?:#|\/|=)([A-Za-z0-9]{4,12})(?:$|[\/\?#&])/);
      if (hashMatch) {
        return hashMatch[1].toUpperCase();
      }
      const genericMatch = parsed.hash.match(/([A-Za-z0-9]{4,12})/);
      if (genericMatch && !["sherif", "public", "games"].includes(genericMatch[1].toLowerCase())) {
        return genericMatch[1].toUpperCase();
      }
    }

    // 3. Check Path trailing segment /CODE
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const seg = pathSegments[i];
      if (/^[A-Z0-9]{4,12}$/i.test(seg) && !["games", "sherif", "public", "dist"].includes(seg.toLowerCase())) {
        return seg.toUpperCase();
      }
    }
  } catch (err) {
    console.warn("[p2play-core/url] Error parsing URL:", err);
  }

  return null;
}

/**
 * Copies the shareable room URL to the user's clipboard.
 */
export async function copyRoomUrlToClipboard(roomCode: string, options?: RoomUrlOptions): Promise<boolean> {
  const url = buildRoomUrl(roomCode, options);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch (err) {
    console.warn("[p2play-core/url] Failed to copy using navigator.clipboard, fallback to execCommand", err);
  }

  // Fallback for older browsers / iframe restrictions
  try {
    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Updates the browser address bar to the shareable room URL (hash `/#/CODE` by default)
 * so the host can copy it from the location bar after creating a room.
 */
export function syncRoomUrlToAddressBar(roomCode: string, options: RoomUrlOptions = {}): void {
  if (typeof window === "undefined") return;
  const cleanCode = roomCode.trim().toUpperCase();
  if (!cleanCode) return;
  if (extractRoomCodeFromUrl() === cleanCode) return;

  const useHash = options.useHash ?? true;
  if (useHash) {
    const pathAndQuery = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", `${pathAndQuery}#/${cleanCode}`);
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("room", cleanCode);
  window.history.replaceState(null, "", url.toString());
}

/**
 * Removes room code from the address bar (hash or `?room=` query).
 */
export function clearRoomUrlFromAddressBar(options: RoomUrlOptions = {}): void {
  if (typeof window === "undefined") return;
  const useHash = options.useHash ?? true;

  if (useHash) {
    if (!window.location.hash) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["room", "code", "r", "join"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState(null, "", url.toString());
  }
}

/**
 * Subscribes to browser navigations that can change the room code in the URL
 * (hash edits in the address bar, back/forward).
 *
 * `history.replaceState` used by sync/clear does not fire hashchange/popstate;
 * we still detect those URL updates via a light hash/search poll so address-bar
 * edits are never missed.
 */
export function subscribeRoomUrlChanges(onChange: (code: string | null) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let lastKey = `${window.location.search}\0${window.location.hash}`;

  const notifyIfChanged = () => {
    const key = `${window.location.search}\0${window.location.hash}`;
    if (key === lastKey) return;
    lastKey = key;
    onChange(extractRoomCodeFromUrl());
  };

  window.addEventListener("hashchange", notifyIfChanged);
  window.addEventListener("popstate", notifyIfChanged);
  window.addEventListener("focus", notifyIfChanged);
  document.addEventListener("visibilitychange", notifyIfChanged);
  // Address-bar fragment edits are same-document navigations; some cases only
  // update location without a reliable event ordering for React listeners.
  const intervalId = window.setInterval(notifyIfChanged, 400);

  return () => {
    window.removeEventListener("hashchange", notifyIfChanged);
    window.removeEventListener("popstate", notifyIfChanged);
    window.removeEventListener("focus", notifyIfChanged);
    document.removeEventListener("visibilitychange", notifyIfChanged);
    window.clearInterval(intervalId);
  };
}

/**
 * When the address bar points at a different room than the active PeerJS session,
 * reload so the app boots cleanly into the new invitation (hash navigation does
 * not remount React by itself).
 */
export function subscribeForeignRoomReload(getActiveRoomId: () => string | null | undefined): () => void {
  return subscribeRoomUrlChanges((code) => {
    if (!code) return;
    const active = getActiveRoomId()?.trim().toUpperCase();
    if (!active) return;
    if (code !== active) {
      window.location.reload();
    }
  });
}
