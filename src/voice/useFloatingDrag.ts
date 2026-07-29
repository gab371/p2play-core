import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface FloatingPos {
  x: number;
  y: number;
}

export interface UseFloatingDragOptions {
  enabled?: boolean;
  storageKey?: string;
  defaultPos?: FloatingPos;
  /** Snap to left/right edge on release (chat-head style). Default true. */
  snapToEdge?: boolean;
  edgePadding?: number;
}

function readStored(key: string | undefined, fallback: FloatingPos): FloatingPos {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as FloatingPos;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch {
    /* ignore */
  }
  return fallback;
}

function clampPos(
  pos: FloatingPos,
  size: { w: number; h: number },
  pad: number,
): FloatingPos {
  const maxX = Math.max(pad, window.innerWidth - size.w - pad);
  const maxY = Math.max(pad, window.innerHeight - size.h - pad);
  return {
    x: Math.min(maxX, Math.max(pad, pos.x)),
    y: Math.min(maxY, Math.max(pad, pos.y)),
  };
}

/** Android-style floating bubble: drag + optional edge snap. */
export function useFloatingDrag({
  enabled = true,
  storageKey,
  defaultPos = { x: 16, y: 96 },
  snapToEdge = true,
  edgePadding = 12,
}: UseFloatingDragOptions = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<FloatingPos>(() =>
    readStored(storageKey, defaultPos),
  );
  const posRef = useRef(pos);
  posRef.current = pos;
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(false);
  const origin = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });

  const persist = useCallback(
    (next: FloatingPos) => {
      posRef.current = next;
      setPos(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return { w: 56, h: 56 };
    const r = el.getBoundingClientRect();
    return { w: r.width || 56, h: r.height || 56 };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      persist(clampPos(posRef.current, measure(), edgePadding));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, edgePadding, measure, persist]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, select, textarea, [data-no-drag]")) {
        return;
      }
      dragMoved.current = false;
      origin.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startX: posRef.current.x,
        startY: posRef.current.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const dx = e.clientX - origin.current.pointerX;
      const dy = e.clientY - origin.current.pointerY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragMoved.current = true;
      if (!dragMoved.current) return;
      e.preventDefault();
      const next = clampPos(
        {
          x: origin.current.startX + dx,
          y: origin.current.startY + dy,
        },
        measure(),
        edgePadding,
      );
      posRef.current = next;
      setPos(next);
    },
    [dragging, edgePadding, measure],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!dragMoved.current) return;

      let next = clampPos(posRef.current, measure(), edgePadding);
      if (snapToEdge) {
        const { w } = measure();
        const mid = next.x + w / 2;
        next = {
          x: mid < window.innerWidth / 2 ? edgePadding : window.innerWidth - w - edgePadding,
          y: next.y,
        };
        next = clampPos(next, measure(), edgePadding);
      }
      persist(next);
    },
    [dragging, edgePadding, measure, persist, snapToEdge],
  );

  /** True if the last gesture was a drag (suppress click-to-expand). */
  const consumeDragClick = useCallback(() => {
    if (!dragMoved.current) return false;
    dragMoved.current = false;
    return true;
  }, []);

  return {
    rootRef,
    dragging,
    style: enabled
      ? ({
          position: "fixed" as const,
          left: pos.x,
          top: pos.y,
          zIndex: 200,
          touchAction: "none" as const,
          cursor: dragging ? ("grabbing" as const) : ("grab" as const),
        })
      : undefined,
    pointerProps: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }
      : {},
    consumeDragClick,
  };
}
