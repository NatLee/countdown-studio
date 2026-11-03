/**
 * Share links. A countdown travels in the query string, readable by people too:
 *
 *   ?to=2027-01-01T00:00&tz=Asia/Taipei&title=New+Year&repeat=yearly   a moment in a time zone
 *   ?to=2026-11-04T09:30:00Z&title=Standup                             an exact instant (UTC or ±hh:mm)
 *   ?for=25m&title=Focus                                               a timer (d, h, m, s)
 *
 * A running timer is shared as its end instant, so whoever opens the link sees the same
 * countdown; a timer that is not running is shared as its length.
 */
import { LABEL_MAX } from '../config';
import { newId, snapshot, type Countdown, type EventCountdown } from './countdown';
import { formatDurationText, parseDurationText } from './time';
import { epochToWallTime, formatWallTime, isValidTimeZone, parseWallTime } from './zoned';

/** Query parameter names. Changing one breaks links people already shared. */
export const SHARE_PARAMS = ['to', 'tz', 'for', 'title', 'repeat'] as const;

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** The query string (without "?") that describes `c`. */
export function shareQuery(c: Countdown, now: number): string {
  const params = new URLSearchParams();
  if (c.kind === 'event') {
    params.set('to', c.at);
    params.set('tz', c.timeZone);
    if (c.repeat === 'yearly') params.set('repeat', 'yearly');
  } else {
    const snap = snapshot(c, now);
    if (snap.status === 'counting' && snap.endsAt !== null) {
      const endsAt = Math.ceil(snap.endsAt / 1000) * 1000;
      params.set('to', new Date(endsAt).toISOString().replace('.000Z', 'Z'));
    } else {
      params.set('for', formatDurationText(c.durationMs));
    }
  }
  if (c.label) params.set('title', c.label);
  // ":" and "/" are allowed in a query string; leaving them readable keeps links hand-editable.
  return params.toString().replace(/%3A/gi, ':').replace(/%2F/gi, '/');
}

/** A full link to this page with `c` in it. Keeps the page's own path, so it works under any sub-path. */
export function shareUrl(c: Countdown, now: number, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}?${shareQuery(c, now)}`;
}

export type ShareResult = { ok: true; countdown: Countdown } | { ok: false; error: string };

export function cleanLabel(text: string | null | undefined): string {
  return (text ?? '').trim().replace(/\s+/g, ' ').slice(0, LABEL_MAX);
}

/**
 * Reads a share link. Returns null when the query has no countdown in it at all, so ordinary
 * visits are not treated as broken links.
 */
export function parseShareQuery(search: string, now: number, viewerTimeZone: string): ShareResult | null {
  const params = new URLSearchParams(search);
  const to = params.get('to');
  const duration = params.get('for');
  if (to === null && duration === null) return null;
  if (to !== null && duration !== null) {
    return { ok: false, error: 'The link has both "to" and "for"; it should have one of them.' };
  }
  const label = cleanLabel(params.get('title'));

  if (duration !== null) {
    const durationMs = parseDurationText(duration);
    if (durationMs === null) {
      return { ok: false, error: `"for=${duration}" is not a length of time like 25m or 1h30m.` };
    }
    return {
      ok: true,
      countdown: { kind: 'timer', id: newId(), label: label || 'Timer', createdAt: now, durationMs, state: { status: 'idle' } },
    };
  }

  const repeat: EventCountdown['repeat'] = params.get('repeat') === 'yearly' ? 'yearly' : 'none';
  const base = { kind: 'event' as const, id: newId(), label: label || 'Countdown', createdAt: now, repeat };
  const text = (to ?? '').trim();

  if (INSTANT.test(text)) {
    const instant = Date.parse(text);
    if (Number.isNaN(instant)) return { ok: false, error: `"to=${text}" is not a real date.` };
    const at = formatWallTime(epochToWallTime(instant, viewerTimeZone));
    return { ok: true, countdown: { ...base, at, timeZone: viewerTimeZone } };
  }

  const wall = parseWallTime(text);
  if (!wall) {
    return { ok: false, error: `"to=${text}" is not a date like 2027-01-01T00:00.` };
  }
  const timeZone = params.get('tz')?.trim() || viewerTimeZone;
  if (!isValidTimeZone(timeZone)) {
    return { ok: false, error: `"tz=${timeZone}" is not a time zone this browser knows.` };
  }
  return { ok: true, countdown: { ...base, at: formatWallTime(wall), timeZone } };
}

/** The same URL without the share parameters (other parameters are kept). */
export function withoutShareParams(href: string): string {
  const url = new URL(href);
  for (const name of SHARE_PARAMS) url.searchParams.delete(name);
  return url.toString();
}
