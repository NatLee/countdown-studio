/** App state: the countdown list, which one is selected, and settings. A plain reducer, easy to test. */
import {
  adjustTimer,
  pauseTimer,
  resetTimer,
  sameCountdown,
  startTimer,
  toggleTimer,
  type Countdown,
  type TimerCountdown,
} from '../lib/countdown';
import { newYearCountdown } from '../lib/presets';
import { parseShareQuery } from '../lib/share';
import { DEFAULT_SETTINGS, type SavedState, type Settings } from '../lib/storage';

export type AppState = SavedState;

export type TimerOp = 'toggle' | 'start' | 'pause' | 'reset';

export type Action =
  | { type: 'add'; countdown: Countdown }
  | { type: 'update'; countdown: Countdown }
  | { type: 'remove'; id: string }
  | { type: 'restore'; countdown: Countdown; index: number }
  | { type: 'select'; id: string }
  | { type: 'selectStep'; step: 1 | -1 }
  | { type: 'timer'; id: string; op: TimerOp; now: number }
  | { type: 'adjust'; id: string; deltaMs: number; now: number }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: AppState };

const timerOps: Record<TimerOp, (c: TimerCountdown, now: number) => TimerCountdown> = {
  toggle: toggleTimer,
  start: startTimer,
  pause: pauseTimer,
  reset: (c) => resetTimer(c),
};

function mapTimer(state: AppState, id: string, fn: (c: TimerCountdown) => TimerCountdown): AppState {
  let changed = false;
  const countdowns = state.countdowns.map((c) => {
    if (c.id !== id || c.kind !== 'timer') return c;
    const next = fn(c);
    changed ||= next !== c;
    return next;
  });
  return changed ? { ...state, countdowns } : state;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add':
      return { ...state, countdowns: [...state.countdowns, action.countdown], selectedId: action.countdown.id };
    case 'update':
      return {
        ...state,
        countdowns: state.countdowns.map((c) => (c.id === action.countdown.id ? action.countdown : c)),
      };
    case 'remove': {
      const index = state.countdowns.findIndex((c) => c.id === action.id);
      if (index < 0) return state;
      const countdowns = state.countdowns.filter((c) => c.id !== action.id);
      const selectedId =
        state.selectedId === action.id
          ? (countdowns[Math.min(index, countdowns.length - 1)]?.id ?? null)
          : state.selectedId;
      return { ...state, countdowns, selectedId };
    }
    case 'restore': {
      if (state.countdowns.some((c) => c.id === action.countdown.id)) return state;
      const countdowns = [...state.countdowns];
      countdowns.splice(Math.min(action.index, countdowns.length), 0, action.countdown);
      return { ...state, countdowns, selectedId: action.countdown.id };
    }
    case 'select':
      return state.countdowns.some((c) => c.id === action.id) ? { ...state, selectedId: action.id } : state;
    case 'selectStep': {
      const n = state.countdowns.length;
      if (n === 0) return state;
      const current = state.countdowns.findIndex((c) => c.id === state.selectedId);
      const next = current < 0 ? 0 : (current + action.step + n) % n;
      return { ...state, selectedId: state.countdowns[next].id };
    }
    case 'timer':
      return mapTimer(state, action.id, (c) => timerOps[action.op](c, action.now));
    case 'adjust':
      return mapTimer(state, action.id, (c) => adjustTimer(c, action.deltaMs, action.now));
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.state;
  }
}

/** The selected countdown, or the first one when nothing is selected. */
export function selectedCountdown(state: AppState): Countdown | null {
  return state.countdowns.find((c) => c.id === state.selectedId) ?? state.countdowns[0] ?? null;
}

/** What to tell the user about a share link the page was opened with. */
export type BootNotice = { kind: 'added'; id: string; label: string } | { kind: 'existing'; label: string } | { kind: 'error'; message: string };

/**
 * The state the page starts with: what was saved (or the New Year countdown the old page
 * showed, on a first visit), plus the countdown from a share link if the URL has one.
 */
export function bootState(
  saved: AppState | null,
  search: string,
  now: number,
  timeZone: string,
): { state: AppState; notice: BootNotice | null } {
  let state = saved;
  if (!state) {
    const first = newYearCountdown(now, timeZone);
    state = { countdowns: [first], selectedId: first.id, settings: DEFAULT_SETTINGS };
  }
  const shared = parseShareQuery(search, now, timeZone);
  if (!shared) return { state, notice: null };
  if (!shared.ok) return { state, notice: { kind: 'error', message: shared.error } };
  const existing = state.countdowns.find((c) => sameCountdown(c, shared.countdown));
  if (existing) {
    return { state: { ...state, selectedId: existing.id }, notice: { kind: 'existing', label: existing.label } };
  }
  return {
    state: reducer(state, { type: 'add', countdown: shared.countdown }),
    notice: { kind: 'added', id: shared.countdown.id, label: shared.countdown.label },
  };
}
