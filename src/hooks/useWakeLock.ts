import { useEffect } from 'react';

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/**
 * Keeps the screen on while `active` (Screen Wake Lock API). The browser drops the lock when
 * the tab is hidden, so it is asked for again when the tab comes back.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !wakeLockSupported()) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (stopped) await next.release();
        else lock = next;
      } catch {
        // Refused (battery saver, no permission): the countdown works the same, the screen may dim.
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}
