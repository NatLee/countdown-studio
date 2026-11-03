/**
 * Wall-clock time in a named IANA time zone ↔ an exact instant (epoch milliseconds).
 * Uses only Intl.DateTimeFormat, so it follows the browser's own time-zone database.
 */

export interface WallTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parses "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" (the format of <input type="datetime-local">). */
export function parseWallTime(text: string): WallTime | null {
  const match = WALL_TIME.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((v) => Number(v ?? 0));
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const valid =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day &&
    probe.getUTCHours() === hour &&
    probe.getUTCMinutes() === minute &&
    probe.getUTCSeconds() === second;
  return valid ? { year, month, day, hour, minute, second } : null;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The inverse of parseWallTime. Seconds are written only when they are not zero. */
export function formatWallTime(w: WallTime): string {
  const base = `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
  return w.second ? `${base}:${pad(w.second)}` : base;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The wall-clock reading in `timeZone` at instant `epoch`. */
export function epochToWallTime(epoch: number, timeZone: string): WallTime {
  const out: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(epoch)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour,
    minute: out.minute,
    second: out.second,
  };
}

const wallAsUtc = (w: WallTime) => Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);

/** How far `timeZone` is ahead of UTC at instant `epoch`, in milliseconds. */
function offsetAt(epoch: number, timeZone: string): number {
  const whole = Math.floor(epoch / 1000) * 1000;
  return wallAsUtc(epochToWallTime(whole, timeZone)) - whole;
}

/**
 * The instant when clocks in `timeZone` read `w`.
 * Around daylight-saving changes it behaves like JavaScript's own Date:
 * a time that happens twice picks the first one, a time that is skipped moves forward.
 */
export function wallTimeToEpoch(w: WallTime, timeZone: string): number {
  const asUtc = wallAsUtc(w);
  // Real zones change their offset at most once within a day, so the offsets a day before and
  // a day after give every reading the wall time can have.
  const candidates = [offsetAt(asUtc - DAY_MS, timeZone), offsetAt(asUtc + DAY_MS, timeZone)].map(
    (offset) => ({ epoch: asUtc - offset, offset }),
  );
  const real = candidates.filter((c) => offsetAt(c.epoch, timeZone) === c.offset).map((c) => c.epoch);
  if (real.length > 0) return Math.min(...real);
  // Clocks jumped over this wall time: move forward, to the later reading.
  return Math.max(...candidates.map((c) => c.epoch));
}

const DAY_MS = 86_400_000;

/** True when the browser knows `timeZone` (e.g. "Asia/Taipei", "UTC"). */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The viewer's own time zone, falling back to UTC when the browser does not say. */
export function localTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone && isValidTimeZone(zone) ? zone : 'UTC';
}

/** Every zone the browser knows, for the time-zone picker. */
export function supportedTimeZones(): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const zones = new Set(all);
  zones.add('UTC');
  zones.add(localTimeZone());
  return [...zones].sort();
}
