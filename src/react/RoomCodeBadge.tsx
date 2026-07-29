import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyRoomUrlToClipboard } from "../url";
import { cn } from "../ui/utils";

export interface CopyRoomLinkButtonProps {
  code: string;
  className?: string;
  iconClassName?: string;
  id?: string;
}

/** Icon-only control: copies the shareable room URL to the clipboard. */
export function CopyRoomLinkButton({
  code,
  className = "",
  iconClassName = "size-3.5",
  id,
}: CopyRoomLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!code) return;
    void copyRoomUrlToClipboard(code).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      id={id}
      type="button"
      onClick={handleCopy}
      title={copied ? "Lien copié !" : "Copier le lien d'invitation"}
      aria-label={copied ? "Lien copié" : "Copier le lien d'invitation"}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors",
        "hover:bg-white/10 hover:text-zinc-100",
        copied && "text-emerald-400 hover:text-emerald-300",
        className,
      )}
    >
      {copied ? <Check className={iconClassName} aria-hidden /> : <Copy className={iconClassName} aria-hidden />}
    </button>
  );
}

export interface RoomCodeBadgeProps {
  code: string;
  /** Prefix before the code, e.g. "Salon" → "Salon : CODE". */
  label?: string;
  /** Tailwind classes for the code color (theme accent). */
  accentClassName?: string;
  className?: string;
}

/** In-game / header chip: code + copy icon in one pill. */
export function RoomCodeBadge({
  code,
  label = "Salon",
  accentClassName = "text-amber-400",
  className = "",
}: RoomCodeBadgeProps) {
  if (!code) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 py-1 pl-3 pr-1 font-mono text-xs text-zinc-400",
        className,
      )}
    >
      <span>
        {label} : <span className={cn("font-bold", accentClassName)}>{code}</span>
      </span>
      <CopyRoomLinkButton code={code} className="size-6" iconClassName="size-3" />
    </span>
  );
}
