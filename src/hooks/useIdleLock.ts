import { useEffect } from "react";

/**
 * Locks the session after `minutes` of no user activity.
 * Calls onLock() — typically signOut + navigate to /auth.
 * Cheap, client-side only. No DB, no edge fn.
 */
export function useIdleLock(minutes: number, onLock: () => void) {
  useEffect(() => {
    let timer: number | undefined;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(onLock, minutes * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [minutes, onLock]);
}
