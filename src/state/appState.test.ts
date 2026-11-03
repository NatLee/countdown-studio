import { describe, expect, it } from 'vitest';
import type { Countdown, TimerCountdown } from '../lib/countdown';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { MINUTE } from '../lib/time';
import { bootState, reducer, selectedCountdown, type AppState } from './appState';

const NOW = Date.UTC(2026, 10, 4, 1, 0, 0);

const timer = (id: string, label = id): TimerCountdown => ({
  kind: 'timer',
  id,
  label,
  createdAt: NOW,
  durationMs: 5 * MINUTE,
  state: { status: 'idle' },
});

const base = (): AppState => ({
  countdowns: [timer('a'), timer('b'), timer('c')],
  selectedId: 'b',
  settings: DEFAULT_SETTINGS,
});

describe('reducer', () => {
  it('adds and selects a new countdown', () => {
    const next = reducer(base(), { type: 'add', countdown: timer('d') });
    expect(next.countdowns.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(next.selectedId).toBe('d');
  });

  it('removes a countdown, moves the selection, and can put it back', () => {
    const removed = reducer(base(), { type: 'remove', id: 'b' });
    expect(removed.countdowns.map((c) => c.id)).toEqual(['a', 'c']);
    expect(removed.selectedId).toBe('c');
    const restored = reducer(removed, { type: 'restore', countdown: timer('b'), index: 1 });
    expect(restored.countdowns.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(restored.selectedId).toBe('b');
    // Restoring twice does nothing.
    expect(reducer(restored, { type: 'restore', countdown: timer('b'), index: 1 })).toBe(restored);
  });

  it('clears the selection when the last countdown goes', () => {
    const one: AppState = { ...base(), countdowns: [timer('a')], selectedId: 'a' };
    expect(reducer(one, { type: 'remove', id: 'a' }).selectedId).toBeNull();
  });

  it('steps the selection around the list', () => {
    expect(reducer(base(), { type: 'selectStep', step: 1 }).selectedId).toBe('c');
    expect(reducer({ ...base(), selectedId: 'c' }, { type: 'selectStep', step: 1 }).selectedId).toBe('a');
    expect(reducer({ ...base(), selectedId: 'a' }, { type: 'selectStep', step: -1 }).selectedId).toBe('c');
  });

  it('runs timer operations on the right countdown only', () => {
    const before = base();
    const started = reducer(before, { type: 'timer', id: 'b', op: 'start', now: NOW });
    expect(started.countdowns[1]).toMatchObject({ state: { status: 'running', endsAt: NOW + 5 * MINUTE } });
    expect(started.countdowns[0]).toBe(before.countdowns[0]);
    const adjusted = reducer(started, { type: 'adjust', id: 'b', deltaMs: MINUTE, now: NOW });
    expect(adjusted.countdowns[1]).toMatchObject({ durationMs: 6 * MINUTE });
    // Unknown ids and no-op operations keep the same state object (no needless re-render or save).
    expect(reducer(started, { type: 'timer', id: 'nope', op: 'start', now: NOW })).toBe(started);
    expect(reducer(started, { type: 'timer', id: 'b', op: 'start', now: NOW })).toBe(started);
  });

  it('patches settings', () => {
    expect(reducer(base(), { type: 'settings', patch: { muted: true } }).settings).toEqual({ ...DEFAULT_SETTINGS, muted: true });
  });

  it('finds the selected countdown, falling back to the first', () => {
    expect(selectedCountdown(base())?.id).toBe('b');
    expect(selectedCountdown({ ...base(), selectedId: null })?.id).toBe('a');
    expect(selectedCountdown({ ...base(), countdowns: [] })).toBeNull();
  });
});

describe('bootState', () => {
  it('starts a first visit with the New Year countdown, like the old page', () => {
    const { state, notice } = bootState(null, '', NOW, 'Asia/Taipei');
    expect(notice).toBeNull();
    expect(state.countdowns).toHaveLength(1);
    expect(state.countdowns[0]).toMatchObject({ kind: 'event', label: 'New Year', at: '2027-01-01T00:00', timeZone: 'Asia/Taipei', repeat: 'yearly' });
    expect(state.selectedId).toBe(state.countdowns[0].id);
  });

  it('adds a shared countdown and selects it', () => {
    const { state, notice } = bootState(base(), '?for=25m&title=Focus', NOW, 'UTC');
    const added = state.countdowns.at(-1) as Countdown;
    expect(added).toMatchObject({ kind: 'timer', label: 'Focus', durationMs: 25 * MINUTE });
    expect(state.selectedId).toBe(added.id);
    expect(notice).toEqual({ kind: 'added', id: added.id, label: 'Focus' });
  });

  it('does not add the same shared countdown twice', () => {
    const { state, notice } = bootState(base(), '?for=5m&title=c', NOW, 'UTC');
    expect(state.countdowns).toHaveLength(3);
    expect(state.selectedId).toBe('c');
    expect(notice).toEqual({ kind: 'existing', label: 'c' });
  });

  it('reports a broken link and keeps the saved state', () => {
    const saved = base();
    const { state, notice } = bootState(saved, '?for=later', NOW, 'UTC');
    expect(state).toBe(saved);
    expect(notice?.kind).toBe('error');
  });
});
