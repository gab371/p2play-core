import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearProfile,
  clearSession,
  loadProfile,
  loadSession,
  saveProfile,
  saveSession,
} from "./helpers";

const store = new Map<string, string>();

function installLocalStorageMock(): void {
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    configurable: true,
    writable: true,
  });
}

installLocalStorageMock();

afterEach(() => {
  store.clear();
});

describe("p2play:profile", () => {
  it("saves and loads a durable profile", () => {
    saveProfile({ username: "Alice", avatar: "🦊" });
    const p = loadProfile();
    assert.ok(p !== null);
    assert.equal(p!.username, "Alice");
    assert.equal(p!.avatar, "🦊");
    assert.ok(p!.updatedAt > 0);
  });

  it("ignores empty username and corrupt JSON", () => {
    saveProfile({ username: "   ", avatar: "👑" });
    assert.equal(loadProfile(), null);
    store.set("p2play:profile", "{not-json");
    assert.equal(loadProfile(), null);
    store.set("p2play:profile", JSON.stringify({ avatar: "👑" }));
    assert.equal(loadProfile(), null);
  });

  it("clearProfile does not clear room session", () => {
    saveProfile({ username: "Bob", avatar: "🎮" });
    saveSession("ROOM1", {
      previousPeerId: "peer-a",
      username: "Bob",
      avatar: "🎮",
      role: "player",
      sessionToken: "tok",
    });
    clearProfile();
    assert.equal(loadProfile(), null);
    assert.equal(loadSession("ROOM1")?.username, "Bob");
    clearSession("ROOM1");
    assert.equal(loadSession("ROOM1"), null);
  });
});
