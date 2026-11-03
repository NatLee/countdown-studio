/**
 * Saving to and loading from localStorage. Whatever comes back is checked field by field:
 * the data may be from an older version, edited by hand, or written by another tab.
 */
import { LABEL_MAX, STORAGE_VERSION } from '../config';
import type { Countdown, TimerState } from './countdown';
import { DEFAULT_THEME, isThemeId, type ThemeId } from './themes';
import { isValidTimeZone, parseWallTime } from './zoned';

export interface Settings {
  theme: ThemeId;
  /** 0–1 */
  volume: number;
  muted: boolean;
  /** Show a browser notification when a countdown ends while the page is in the background. */
  notify: boolean;
  /** Keep the screen on while something is counting down. */
  keepAwake: boolean;
}

export interface SavedState {
  countdowns: Countdown[];
  selectedId: string | null;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  volume: 0.8,
  muted: false,
  notify: false,
  keepAwake: true,
};

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';

function readTimerState(v: unknown): TimerState | null {
  if (!isObject(v)) return null;
  if (v.status === 'idle') return { status: 'idle' };
  if (v.status === 'running' && isFiniteNumber(v.endsAt)) return { status: 'running', endsAt: v.endsAt };
  if (v.status === 'paused' && isFiniteNumber(v.remainingMs) && v.remainingMs >= 0) {
    return { status: 'paused', remainingMs: v.remainingMs };
  }
  return null;
}

/** A countdown from untrusted data, or null when any field is missing or wrong. */
export function readCountdown(v: unknown): Countdown | null {
  if (!isObject(v) || !isString(v.id) || !v.id || !isString(v.label) || !isFiniteNumber(v.createdAt)) return null;
  const common = { id: v.id, label: v.label.slice(0, LABEL_MAX), createdAt: v.createdAt };
  if (v.kind === 'event') {
    if (!isString(v.at) || !parseWallTime(v.at)) return null;
    if (!isString(v.timeZone) || !isValidTimeZone(v.timeZone)) return null;
    const repeat = v.repeat === 'yearly' ? 'yearly' : 'none';
    return { kind: 'event', ...common, at: v.at, timeZone: v.timeZone, repeat };
  }
  if (v.kind === 'timer') {
    if (!isFiniteNumber(v.durationMs) || v.durationMs <= 0) return null;
    const state = readTimerState(v.state);
    if (!state) return null;
    return { kind: 'timer', ...common, durationMs: v.durationMs, state };
  }
  return null;
}

export function readSettings(v: unknown): Settings {
  const s = isObject(v) ? v : {};
  return {
    theme: isThemeId(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    volume: isFiniteNumber(s.volume) ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume,
    muted: typeof s.muted === 'boolean' ? s.muted : DEFAULT_SETTINGS.muted,
    notify: typeof s.notify === 'boolean' ? s.notify : DEFAULT_SETTINGS.notify,
    keepAwake: typeof s.keepAwake === 'boolean' ? s.keepAwake : DEFAULT_SETTINGS.keepAwake,
  };
}

export function serializeState(state: SavedState): string {
  return JSON.stringify({ version: STORAGE_VERSION, ...state });
}

/** Reads saved text. Returns null when there is nothing usable, so the caller can start fresh. */
export function deserializeState(text: string | null): SavedState | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.version !== STORAGE_VERSION || !Array.isArray(data.countdowns)) return null;
  const seen = new Set<string>();
  const countdowns = data.countdowns
    .map(readCountdown)
    .filter((c): c is Countdown => c !== null && !seen.has(c.id) && Boolean(seen.add(c.id)));
  const selectedId = isString(data.selectedId) && seen.has(data.selectedId) ? data.selectedId : null;
  return { countdowns, selectedId, settings: readSettings(data.settings) };
}

/** localStorage can be missing or throw (private windows, blocked storage). Both mean "no storage". */
export function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadState(storage: Storage | null, key: string): SavedState | null {
  try {
    return deserializeState(storage?.getItem(key) ?? null);
  } catch {
    return null;
  }
}

export function saveState(storage: Storage | null, key: string, state: SavedState): void {
  try {
    storage?.setItem(key, serializeState(state));
  } catch {
    // Full or blocked storage: the app keeps working, it just will not remember.
  }
}
