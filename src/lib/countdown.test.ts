import { describe, expect, it } from 'vitest';
import {
  YEARLY_HOLD_MS,
  adjustTimer,
  newId,
  pauseTimer,
  resetTimer,
  sameCountdown,
  snapshot,
  startTimer,
  toggleTimer,
  type EventCountdown,
  type TimerCountdown,
} from './countdown';
import { MINUTE, SECOND } from './time';

const T0 = Date.UTC(2026, 10, 4, 1, 0, 0); // 2026-11-04 09:00 in Taipei

const timer = (durationMs = 25 * MINUTE): TimerCountdown => ({
  kind: 'timer',
  id: 't1',
  label: 'Focus',
  createdAt: T0,
  durationMs,
  state: { status: 'idle' },
});

const newYear = (overrides: Partial<EventCountdown> = {}): EventCountdown => ({
  kind: 'event',
  id: 'e1',
  label: 'New Year',
  createdAt: T0,
  at: '2027-01-01T00:00',
  timeZone: 'Asia/Taipei',
  repeat: 'none',
  ...overrides,
});

describe('timers', () => {
  it('shows the full length before it starts', () => {
    expect(snapshot(timer(), T0)).toEqual({ status: 'idle', remainingMs: 25 * MINUTE, endsAt: null, progress: 0 });
  });

  it('computes what is left from the end time, not by counting ticks', () => {
    const running = startTimer(timer(), T0);
    expect(snapshot(running, T0 + 61 * SECOND).remainingMs).toBe(25 * MINUTE - 61 * SECOND);
    // A background tab may not run any code for minutes; the next look is still exact.
    const later = snapshot(running, T0 + 10 * MINUTE + 250);
    expect(later.remainingMs).toBe(15 * MINUTE - 250);
    expect(later.status).toBe('counting');
    expect(later.progress).toBeCloseTo(0.4, 3);
  });

  it('pauses and resumes without losing or gaining time', () => {
    let t = startTimer(timer(), T0);
    t = pauseTimer(t, T0 + 5 * MINUTE);
    expect(t.state).toEqual({ status: 'paused', remainingMs: 20 * MINUTE });
    // Ten minutes on pause do not count.
    t = startTimer(t, T0 + 15 * MINUTE);
    expect(snapshot(t, T0 + 20 * MINUTE).remainingMs).toBe(15 * MINUTE);
  });

  it('finishes at zero and then counts overtime', () => {
    const t = startTimer(timer(MINUTE), T0);
    expect(snapshot(t, T0 + MINUTE - 1).status).toBe('counting');
    const done = snapshot(t, T0 + MINUTE);
    expect(done.status).toBe('finished');
    expect(snapshot(t, T0 + 2 * MINUTE).remainingMs).toBe(-MINUTE);
    expect(done.progress).toBe(1);
  });

  it('toggles between running and paused, and restarts a finished timer', () => {
    let t = toggleTimer(timer(MINUTE), T0);
    expect(t.state.status).toBe('running');
    t = toggleTimer(t, T0 + 10 * SECOND);
    expect(t.state).toEqual({ status: 'paused', remainingMs: 50 * SECOND });
    t = toggleTimer(t, T0 + 20 * SECOND);
    expect(t.state).toEqual({ status: 'running', endsAt: T0 + 70 * SECOND });
    // Finished: starting again begins a fresh minute.
    t = toggleTimer(t, T0 + 2 * MINUTE);
    expect(t.state).toEqual({ status: 'running', endsAt: T0 + 3 * MINUTE });
  });

  it('ignores pause when not running and resets to idle', () => {
    const idle = timer();
    expect(pauseTimer(idle, T0)).toBe(idle);
    expect(resetTimer(startTimer(idle, T0)).state).toEqual({ status: 'idle' });
    expect(resetTimer(idle)).toBe(idle);
  });

  it('adds and removes time, keeping the ring consistent', () => {
    const running = startTimer(timer(10 * MINUTE), T0);
    const longer = adjustTimer(running, MINUTE, T0 + MINUTE);
    expect(longer.durationMs).toBe(11 * MINUTE);
    expect(snapshot(longer, T0 + MINUTE).remainingMs).toBe(10 * MINUTE);

    const paused = adjustTimer(pauseTimer(running, T0 + MINUTE), -MINUTE, T0 + MINUTE);
    expect(paused.state).toEqual({ status: 'paused', remainingMs: 8 * MINUTE });

    // Never shorter than one second.
    expect(adjustTimer(timer(30 * SECOND), -MINUTE, T0).durationMs).toBe(SECOND);
    // Pushed past zero while running: it finishes.
    expect(snapshot(adjustTimer(running, -10 * MINUTE, T0 + MINUTE), T0 + MINUTE).status).toBe('finished');
  });
});

describe('event countdowns', () => {
  it('counts down to a wall-clock time in its own time zone', () => {
    const snap = snapshot(newYear(), T0);
    expect(snap.endsAt).toBe(Date.UTC(2026, 11, 31, 16, 0, 0));
    expect(snap.status).toBe('counting');
    expect(snap.progress).toBe(0);
  });

  it('measures progress from when it was created', () => {
    const end = Date.UTC(2026, 11, 31, 16, 0, 0);
    const half = T0 + (end - T0) / 2;
    expect(snapshot(newYear(), half).progress).toBeCloseTo(0.5, 5);
  });

  it('stays finished once the moment has passed', () => {
    const after = Date.UTC(2027, 0, 2);
    const snap = snapshot(newYear(), after);
    expect(snap.status).toBe('finished');
    expect(snap.remainingMs).toBeLessThan(0);
  });

  it('rolls a yearly countdown over after the celebration', () => {
    const c = newYear({ repeat: 'yearly', at: '2020-01-01T00:00' });
    const midnight = Date.UTC(2026, 11, 31, 16, 0, 0);
    expect(snapshot(c, midnight - SECOND).endsAt).toBe(midnight);
    const justAfter = snapshot(c, midnight + 30 * MINUTE);
    expect(justAfter.status).toBe('finished');
    expect(justAfter.endsAt).toBe(midnight);
    const nextYear = snapshot(c, midnight + YEARLY_HOLD_MS + SECOND);
    expect(nextYear.status).toBe('counting');
    expect(nextYear.endsAt).toBe(Date.UTC(2027, 11, 31, 16, 0, 0));
  });

  it('shows a yearly countdown as progress through the year', () => {
    const c = newYear({ repeat: 'yearly' });
    // 2026-07-02 12:00 in Taipei is half-way through 2026.
    const midYear = Date.UTC(2026, 6, 2, 4, 0, 0);
    expect(snapshot(c, midYear).progress).toBeCloseTo(0.5, 2);
  });
});

describe('helpers', () => {
  it('makes short unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-z]{12}$/);
  });

  it('compares what a countdown means, not its id or state', () => {
    expect(sameCountdown(timer(), { ...startTimer(timer(), T0), id: 'other' })).toBe(true);
    expect(sameCountdown(timer(), timer(MINUTE))).toBe(false);
    expect(sameCountdown(newYear(), { ...newYear(), id: 'x', createdAt: 0 })).toBe(true);
    expect(sameCountdown(newYear(), newYear({ timeZone: 'UTC' }))).toBe(false);
    expect(sameCountdown(newYear(), timer())).toBe(false);
  });
});
