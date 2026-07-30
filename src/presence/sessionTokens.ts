/** Host-side map of peerId → sessionToken for reconnect verification. */
export class SessionTokenRegistry {
  private tokens = new Map<string, string>();

  register(peerId: string, token: string): void {
    if (!peerId || !token) return;
    this.tokens.set(peerId, token);
  }

  /** Returns true if no token was stored yet (legacy) or token matches. */
  verify(peerId: string, token: string | undefined): boolean {
    const expected = this.tokens.get(peerId);
    if (expected === undefined) return false;
    return typeof token === "string" && token.length > 0 && token === expected;
  }

  transfer(oldPeerId: string, newPeerId: string, newToken?: string): void {
    const prev = this.tokens.get(oldPeerId);
    this.tokens.delete(oldPeerId);
    if (newToken) this.tokens.set(newPeerId, newToken);
    else if (prev) this.tokens.set(newPeerId, prev);
  }

  clear(peerId: string): void {
    this.tokens.delete(peerId);
  }
}
