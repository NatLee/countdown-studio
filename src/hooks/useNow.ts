import { useEffect, useState } from 'react';
import { TICK_MS } from '../config';

/**
 * The current time, refreshed every `tickMs` and immediately when the tab becomes visible again
 * (browsers slow down timers in background tabs). Values derived from it stay exact because
 * they are computed from timestamps, never by counting ticks.
 */
export function useNow(tickMs = TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const id = window.setInterval(update, tickMs);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [tickMs]);
  return now;
}
