import { useMemo } from "react";
import { canChangeRole, isSpectator } from "./helpers";
import type { ParticipantRole, SpectatorConfig } from "./types";

export function useSpectatorRole(
  config: SpectatorConfig,
  myPeerId: string | null,
  isHost: boolean,
) {
  return useMemo(() => {
    const amSpectator = myPeerId ? isSpectator(myPeerId, config) : false;
    const myRole: ParticipantRole = amSpectator ? "spectator" : "player";
    const canSelfToggle =
      !!myPeerId &&
      canChangeRole(myPeerId, config, {
        requesterPeerId: myPeerId,
        requesterIsHost: isHost,
        nextRole: amSpectator ? "player" : "spectator",
      });

    return {
      myRole,
      isSpectator: amSpectator,
      canSelfToggle,
    };
  }, [config, myPeerId, isHost]);
}
