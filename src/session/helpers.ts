import type { P2PlaySession } from "./types";

const KEY_PREFIX = "p2play:session:";

function storageKey(roomCode: string): string {
  return `${KEY_PREFIX}${roomCode}`;
}

export function createSessionToken(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function saveSession(
  roomCode: string,
  data: Omit<P2PlaySession, "savedAt">,
): void {
  try {
    const session: P2PlaySession = { ...data, savedAt: Date.now() };
    localStorage.setItem(storageKey(roomCode), JSON.stringify(session));
  } catch {
    /* quota exceeded or private browsing — silently ignore */
  }
}

export function loadSession(roomCode: string): P2PlaySession | null {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    return JSON.parse(raw) as P2PlaySession;
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string): void {
  try {
    localStorage.removeItem(storageKey(roomCode));
  } catch {
    /* ignore */
  }
}
