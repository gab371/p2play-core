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
