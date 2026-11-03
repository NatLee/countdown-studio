/**
 * The countdown model. Every value on screen is computed from timestamps (`now` vs. an end
 * instant), never by counting ticks, so a countdown cannot drift and is still right after the
 * browser has slowed down a background tab.
 */
import { HOUR, MINUTE, SECOND } from './time';
import { epochToWallTime, parseWallTime, wallTimeToEpoch, type WallTime } from './zoned';

/** A countdown to a moment: a wall-clock time in a time zone, optionally every year. */
export interface EventCountdown {
  kind: 'event';
  id: string;
  label: string;
  createdAt: number;
  /** Wall-clock time in `timeZone`, "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss". */
  at: string;
  timeZone: string;
  /** "yearly" rolls over to the same date next year once it has finished. */
  repeat: 'none' | 'yearly';
}

export type TimerState =
  | { status: 'idle' }
  | { status: 'running'; endsAt: number }
  | { status: 'paused'; remainingMs: number };

/** A countdown for a length of time that you start, pause and reset. */
export interface TimerCountdown {
  kind: 'timer';
  id: string;
  label: string;
  createdAt: number;
  durationMs: number;
  state: TimerState;
}

export type Countdown = EventCountdown | TimerCountdown;

export type Status = 'idle' | 'paused' | 'counting' | 'finished';

export interface Snapshot {
  status: Status;
  /** Milliseconds left; negative once finished (that is the overtime). */
  remainingMs: number;
  /** When it reaches zero, if it is counting or finished. */
  endsAt: number | null;
  /** How much of the span has gone by, 0–1. */
  progress: number;
}

/**
 * How long a finished yearly countdown keeps showing "Time's up!" before it rolls over to the
 * next year. Long enough for the celebration, short enough that nobody sees a stale screen.
 */
export const YEARLY_HOLD_MS = HOUR;

/** Shortest timer the editor and the +/- buttons allow. */
export const MIN_TIMER_MS = SECOND;

/** How much the +/- buttons and keys add or remove. */
export const ADJUST_STEP_MS = MINUTE;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const withYear = (w: WallTime, year: number): WallTime => ({ ...w, year });

/** The instant an event countdown is aiming at right now, and the instant its span started. */
export function eventSpan(c: EventCountdown, now: number): { start: number; end: number } | null {
  const wall = parseWallTime(c.at);
  if (!wall) return null;
  if (c.repeat === 'none') {
    const end = wallTimeToEpoch(wall, c.timeZone);
    return { start: Math.min(c.createdAt, end), end };
  }
  // Yearly: the first occurrence that has not finished its hold yet. Start a year early so a
  // countdown that just hit zero keeps its "Time's up!" for YEARLY_HOLD_MS.
  const thisYear = epochToWallTime(now, c.timeZone).year;
  for (let year = thisYear - 1; year <= thisYear + 2; year++) {
    const end = wallTimeToEpoch(withYear(wall, year), c.timeZone);
    if (end + YEARLY_HOLD_MS > now) {
      return { start: wallTimeToEpoch(withYear(wall, year - 1), c.timeZone), end };
    }
  }
  return null;
}

/** Everything the UI needs to draw a countdown at instant `now`. */
export function snapshot(c: Countdown, now: number): Snapshot {
  if (c.kind === 'event') {
    const span = eventSpan(c, now);
    if (!span) return { status: 'finished', remainingMs: 0, endsAt: null, progress: 1 };
    const remainingMs = span.end - now;
    const length = span.end - span.start;
    return {
      status: remainingMs > 0 ? 'counting' : 'finished',
      remainingMs,
      endsAt: span.end,
      progress: length > 0 ? clamp01((now - span.start) / length) : 1,
    };
  }
  const { state, durationMs } = c;
  const progressOf = (remaining: number) => clamp01(1 - remaining / durationMs);
  switch (state.status) {
    case 'idle':
      return { status: 'idle', remainingMs: durationMs, endsAt: null, progress: 0 };
    case 'paused':
      return { status: 'paused', remainingMs: state.remainingMs, endsAt: null, progress: progressOf(state.remainingMs) };
    case 'running': {
      const remainingMs = state.endsAt - now;
      return {
        status: remainingMs > 0 ? 'counting' : 'finished',
        remainingMs,
        endsAt: state.endsAt,
        progress: progressOf(remainingMs),
      };
    }
  }
}

/** Starts or resumes a timer. A finished timer starts over from its full length. */
export function startTimer(c: TimerCountdown, now: number): TimerCountdown {
  const { state } = c;
  if (state.status === 'running' && state.endsAt > now) return c;
  const remaining = state.status === 'paused' ? state.remainingMs : c.durationMs;
  return { ...c, state: { status: 'running', endsAt: now + remaining } };
}

/** Pauses a running timer and keeps the time that was left. */
export function pauseTimer(c: TimerCountdown, now: number): TimerCountdown {
  const { state } = c;
  if (state.status !== 'running' || state.endsAt <= now) return c;
  return { ...c, state: { status: 'paused', remainingMs: state.endsAt - now } };
}

/** Start ↔ pause, the one-button behaviour of the play key. */
export function toggleTimer(c: TimerCountdown, now: number): TimerCountdown {
  const s = snapshot(c, now).status;
  return s === 'counting' ? pauseTimer(c, now) : startTimer(c, now);
}

export function resetTimer(c: TimerCountdown): TimerCountdown {
  return c.state.status === 'idle' ? c : { ...c, state: { status: 'idle' } };
}

/**
 * Adds (or with a negative delta, removes) time. The timer's length changes by the same amount,
 * so the progress ring keeps making sense. A running timer pushed past zero finishes.
 */
export function adjustTimer(c: TimerCountdown, deltaMs: number, now: number): TimerCountdown {
  const durationMs = Math.max(MIN_TIMER_MS, c.durationMs + deltaMs);
  const { state } = c;
  switch (state.status) {
    case 'idle':
      return { ...c, durationMs };
    case 'paused':
      return { ...c, durationMs, state: { status: 'paused', remainingMs: Math.max(0, state.remainingMs + deltaMs) } };
    case 'running':
      if (state.endsAt <= now) return c; // already finished: reset or start it again instead
      return { ...c, durationMs, state: { status: 'running', endsAt: state.endsAt + deltaMs } };
  }
}

/** A short random id. Not crypto.randomUUID: that only exists on https pages. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

/** True when two countdowns describe the same thing (ignores id, creation time and timer state). */
export function sameCountdown(a: Countdown, b: Countdown): boolean {
  if (a.label !== b.label) return false;
  if (a.kind === 'event' && b.kind === 'event') {
    return a.at === b.at && a.timeZone === b.timeZone && a.repeat === b.repeat;
  }
  if (a.kind === 'timer' && b.kind === 'timer') return a.durationMs === b.durationMs;
  return false;
}
