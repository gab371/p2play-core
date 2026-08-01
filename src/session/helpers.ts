import type { P2PlayProfile, P2PlaySession } from "./types";

const KEY_PREFIX = "p2play:session:";
const PROFILE_KEY = "p2play:profile";

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

export function saveProfile(data: Omit<P2PlayProfile, "updatedAt">): void {
  const username = typeof data.username === "string" ? data.username.trim() : "";
  const avatar = typeof data.avatar === "string" ? data.avatar : "";
  if (!username) return;
  try {
    const profile: P2PlayProfile = {
      username,
      avatar: avatar || "👤",
      updatedAt: Date.now(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* quota exceeded or private browsing — silently ignore */
  }
}

export function loadProfile(): P2PlayProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<P2PlayProfile>;
    if (typeof parsed.username !== "string" || !parsed.username.trim()) return null;
    return {
      username: parsed.username.trim(),
      avatar: typeof parsed.avatar === "string" && parsed.avatar ? parsed.avatar : "👤",
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}
