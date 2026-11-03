/** Human-readable text for dates, lengths and zones shown around the clock faces. */
import { DATE_LOCALE } from '../config';
import type { Countdown, Snapshot } from './countdown';
import { splitSeconds } from './time';

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(DATE_LOCALE, { hourCycle: 'h23', ...options });
    cache.set(key, f);
  }
  return f;
}

/** "Fri, Jan 1, 2027, 00:00" as read on clocks in `timeZone`. */
export function formatMoment(epoch: number, timeZone: string): string {
  return formatter(`moment:${timeZone}`, {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(epoch);
}

/** "07:12" (or "07:12:30" with seconds) in the viewer's own time zone. */
export function formatTimeOfDay(epoch: number, withSeconds = false): string {
  return formatter(`time:${withSeconds}`, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(epoch);
}

/** "25 min", "1 h 30 min", "2 d 3 h", "45 s". */
export function formatLength(ms: number): string {
  const { days, hours, minutes, seconds } = splitSeconds(Math.round(ms / 1000));
  const parts = [
    days ? `${days} d` : '',
    hours ? `${hours} h` : '',
    minutes ? `${minutes} min` : '',
    seconds ? `${seconds} s` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '0 s';
}

/** "Asia/Taipei" → "Taipei", "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zoneCity(timeZone: string): string {
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}

/** One line under the label saying what the countdown is aiming at. */
export function describeCountdown(c: Countdown, snap: Snapshot): string {
  if (c.kind === 'event') {
    const when = snap.endsAt === null ? c.at : formatMoment(snap.endsAt, c.timeZone);
    return [when, zoneCity(c.timeZone), c.repeat === 'yearly' ? 'every year' : ''].filter(Boolean).join(' · ');
  }
  const length = `${formatLength(c.durationMs)} timer`;
  if (snap.status === 'counting' && snap.endsAt !== null) return `${length} · ends ${formatTimeOfDay(snap.endsAt)}`;
  if (snap.status === 'finished' && snap.endsAt !== null) return `${length} · ended ${formatTimeOfDay(snap.endsAt)}`;
  if (snap.status === 'paused') return `${length} · paused`;
  return length;
}
