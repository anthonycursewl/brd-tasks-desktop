import { useCallback } from "react";
import { playOpen, playComplete, playExpire } from "../services/sounds";

export function useSound() {
  const soundOpen = useCallback(() => playOpen(), []);
  const soundComplete = useCallback(() => playComplete(), []);
  const soundExpire = useCallback(() => playExpire(), []);

  return { soundOpen, soundComplete, soundExpire };
}
