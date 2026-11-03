import { describe, expect, it } from 'vitest';
import type { Countdown } from './countdown';
import {
  DEFAULT_SETTINGS,
  deserializeState,
  loadState,
  readCountdown,
  readSettings,
  saveState,
  serializeState,
  type SavedState,
} from './storage';

const countdowns: Countdown[] = [
  { kind: 'event', id: 'a', label: 'New Year', createdAt: 1, at: '2027-01-01T00:00', timeZone: 'Asia/Taipei', repeat: 'yearly' },
  { kind: 'timer', id: 'b', label: 'Focus', createdAt: 2, durationMs: 1_500_000, state: { status: 'running', endsAt: 99 } },
  { kind: 'timer', id: 'c', label: 'Tea', createdAt: 3, durationMs: 180_000, state: { status: 'paused', remainingMs: 60_000 } },
];

const state: SavedState = { countdowns, selectedId: 'b', settings: { ...DEFAULT_SETTINGS, theme: 'flip', volume: 0.3 } };

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('saved state', () => {
  it('round-trips through JSON', () => {
    expect(deserializeState(serializeState(state))).toEqual(state);
  });

  it('starts fresh on missing, broken or foreign data', () => {
    for (const text of [null, '', '{', '[]', '{"version":999,"countdowns":[]}', '{"version":1}']) {
      expect(deserializeState(text), String(text)).toBeNull();
    }
  });

  it('drops bad countdowns and duplicate ids but keeps the rest', () => {
    const text = JSON.stringify({
      version: 1,
      selectedId: 'gone',
      countdowns: [
        countdowns[0],
        { ...countdowns[1], durationMs: -5 },
        { ...countdowns[2] },
        { ...countdowns[2], label: 'Duplicate' },
        { kind: 'event', id: 'z', label: 'Bad zone', createdAt: 1, at: '2027-01-01T00:00', timeZone: 'Nowhere/Land', repeat: 'none' },
        'nonsense',
      ],
    });
    const back = deserializeState(text);
    expect(back?.countdowns.map((c) => c.id)).toEqual(['a', 'c']);
    expect(back?.selectedId).toBeNull();
    expect(back?.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('checks every countdown field', () => {
    expect(readCountdown({ ...countdowns[0], at: '2027-01-01' })).toBeNull();
    expect(readCountdown({ ...countdowns[1], state: { status: 'running' } })).toBeNull();
    expect(readCountdown({ ...countdowns[1], id: '' })).toBeNull();
    expect(readCountdown({ ...countdowns[0], repeat: 'weekly' })).toMatchObject({ repeat: 'none' });
  });

  it('fills in settings it does not recognise', () => {
    expect(readSettings({ theme: 'vaporwave', volume: 7, muted: 'yes', notify: true })).toEqual({
      ...DEFAULT_SETTINGS,
      volume: 1,
      notify: true,
    });
  });

  it('saves to and loads from storage, and survives storage that throws', () => {
    const storage = new MemoryStorage();
    saveState(storage, 'key', state);
    expect(loadState(storage, 'key')).toEqual(state);
    const broken = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('full'); },
    } as unknown as Storage;
    expect(loadState(broken, 'key')).toBeNull();
    expect(() => saveState(broken, 'key', state)).not.toThrow();
    expect(loadState(null, 'key')).toBeNull();
  });
});
