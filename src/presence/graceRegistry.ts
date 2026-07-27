const DEFAULT_GRACE_MS = 60_000;

export class GraceRegistry {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(peerId: string, onExpire: () => void, ms: number = DEFAULT_GRACE_MS): void {
    this.cancel(peerId);
    const timer = setTimeout(() => {
      this.timers.delete(peerId);
      onExpire();
    }, ms);
    this.timers.set(peerId, timer);
  }

  cancel(peerId: string): void {
    const timer = this.timers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(peerId);
    }
  }

  clearAll(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  has(peerId: string): boolean {
    return this.timers.has(peerId);
  }
}

export const DEFAULT_PRESENCE_GRACE_MS = DEFAULT_GRACE_MS;
