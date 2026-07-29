import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

export const MUTE_STORAGE_KEY = "p2play:sound:muted";

export interface SoundManagerLike {
  setEnabled(enabled: boolean): void;
  playClick?: () => void;
}

export interface SoundToggleProps {
  soundManager: SoundManagerLike;
  className?: string;
}

/**
 * Shared mute toggle. Reads/writes preference via the injected `soundManager`
 * (apps persist `p2play:sound:muted` in their SoundFX implementations).
 */
export function SoundToggle({ soundManager, className }: SoundToggleProps) {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    soundManager.setEnabled(!muted);
  }, [muted, soundManager]);

  const toggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundManager.setEnabled(!nextMuted);
    if (!nextMuted) soundManager.playClick?.();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      title={muted ? "Activer le son" : "Couper le son"}
      className={cn("rounded-full", className)}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </Button>
  );
}

export default SoundToggle;
