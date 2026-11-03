import { useEffect, useEffectEvent, useRef } from 'react';
import { snapshot, type Countdown } from '../lib/countdown';

/** setTimeout cannot wait longer than this (about 24.8 days); longer waits are done in steps. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Calls `onFinish` once when a countdown reaches zero while the page is open.
 *
 * It sets one timeout for the soonest end instead of checking on every screen refresh. A single
 * timeout is not subject to the heavy throttling Chrome applies to repeating timers in tabs that
 * have been hidden for a while, so the alarm still goes off on time in a background tab.
 * Countdowns that ended while the page was closed do not ring when it opens.
 */
export function useFinishAlarms(countdowns: Countdown[], onFinish: (c: Countdown) => void): void {
  const fire = useEffectEvent(onFinish);
  /** id → end instant that was still in the future the last time we looked. */
  const armed = useRef(new Map<string, number>());

  useEffect(() => {
    let timeout: number | undefined;
    const check = () => {
      const now = Date.now();
      const next = new Map<string, number>();
      let soonest = Infinity;
      for (const c of countdowns) {
        const { endsAt } = snapshot(c, now);
        if (endsAt === null) continue;
        if (endsAt > now) {
          next.set(c.id, endsAt);
          soonest = Math.min(soonest, endsAt);
        } else if (armed.current.get(c.id) === endsAt) {
          fire(c);
        }
      }
      armed.current = next;
      window.clearTimeout(timeout);
      if (soonest < Infinity) timeout = window.setTimeout(check, Math.min(soonest - now, MAX_TIMEOUT_MS));
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', check);
    };
  }, [countdowns]);
}
