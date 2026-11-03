/** Plain-number helpers for durations. Everything is in milliseconds unless the name says otherwise. */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Splits a non-negative whole number of seconds into days, hours, minutes and seconds. */
export function splitSeconds(totalSeconds: number): DurationParts {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3_600),
    minutes: Math.floor((s % 3_600) / 60),
    seconds: s % 60,
  };
}

/**
 * Whole seconds a countdown shows for `remainingMs`.
 * Rounds up, the way a kitchen timer does: with 0.4 s left it still shows 00:01,
 * and it reads 00:00 exactly when the time is up.
 */
export function displaySeconds(remainingMs: number): number {
  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / SECOND);
}

/** Whole seconds past the finish line (for the overtime counter). */
export function overtimeSeconds(remainingMs: number): number {
  return remainingMs >= 0 ? 0 : Math.floor(-remainingMs / SECOND);
}

export interface ClockGroup {
  unit: 'days' | 'hours' | 'minutes' | 'seconds';
  /** Digits as shown, already zero-padded (days keep all their digits). */
  digits: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The digit groups a clock face shows. Leading zero groups are dropped
 * (25:00 rather than 00:00:25:00), but minutes and seconds always stay.
 */
export function clockGroups(totalSeconds: number): ClockGroup[] {
  const { days, hours, minutes, seconds } = splitSeconds(totalSeconds);
  const groups: ClockGroup[] = [];
  if (days > 0) groups.push({ unit: 'days', digits: pad2(days) });
  if (days > 0 || hours > 0) groups.push({ unit: 'hours', digits: pad2(hours) });
  groups.push({ unit: 'minutes', digits: pad2(minutes) });
  groups.push({ unit: 'seconds', digits: pad2(seconds) });
  return groups;
}

/** "58:01:24:07", "1:30:00", "5:00" – compact text for titles and labels. */
export function formatClock(totalSeconds: number): string {
  return clockGroups(totalSeconds)
    .map((g, i) => (i === 0 ? String(Number(g.digits)) : g.digits))
    .join(':');
}

const UNIT_WORDS: Record<ClockGroup['unit'], [string, string]> = {
  days: ['day', 'days'],
  hours: ['hour', 'hours'],
  minutes: ['minute', 'minutes'],
  seconds: ['second', 'seconds'],
};

/** "2 days, 1 hour, 5 seconds" – for screen readers. Zero parts are skipped. */
export function describeSeconds(totalSeconds: number): string {
  const parts = splitSeconds(totalSeconds);
  const words = (Object.keys(UNIT_WORDS) as ClockGroup['unit'][])
    .filter((unit) => parts[unit] > 0)
    .map((unit) => `${parts[unit]} ${UNIT_WORDS[unit][parts[unit] === 1 ? 0 : 1]}`);
  return words.length > 0 ? words.join(', ') : '0 seconds';
}

const DURATION_TEXT = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

/**
 * Parses the short duration syntax used in share links: "25m", "1h30m", "2d", "90s".
 * Returns milliseconds, or null when the text is not in that format or is zero.
 */
export function parseDurationText(text: string): number | null {
  const match = DURATION_TEXT.exec(text.trim().toLowerCase());
  if (!match || match[0] === '') return null;
  const [d, h, m, s] = match.slice(1).map((v) => Number(v ?? 0));
  const ms = d * DAY + h * HOUR + m * MINUTE + s * SECOND;
  return ms > 0 && Number.isSafeInteger(ms) ? ms : null;
}

/** The inverse of parseDurationText: 5_400_000 → "1h30m". Sub-second remainders are dropped. */
export function formatDurationText(ms: number): string {
  const { days, hours, minutes, seconds } = splitSeconds(ms / SECOND);
  const text = [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    minutes ? `${minutes}m` : '',
    seconds ? `${seconds}s` : '',
  ].join('');
  return text || '0s';
}
