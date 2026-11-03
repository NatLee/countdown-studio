import { describe, expect, it } from 'vitest';
import { SHORTCUTS, shortcutFor } from './shortcuts';

const press = (key: string, target: Element | null = document.body, mods: Partial<KeyboardEvent> = {}) =>
  shortcutFor({ key, target, ctrlKey: false, metaKey: false, altKey: false, ...mods });

describe('shortcutFor', () => {
  it('maps keys to actions, ignoring letter case', () => {
    expect(press(' ')).toBe('toggle');
    expect(press('f')).toBe('stage');
    expect(press('F')).toBe('stage');
    expect(press('ArrowLeft')).toBe('prev');
    expect(press('=')).toBe('add');
    expect(press('?')).toBe('help');
    expect(press('x')).toBeNull();
  });

  it('leaves browser and system shortcuts alone', () => {
    expect(press('s', document.body, { ctrlKey: true })).toBeNull();
    expect(press('r', document.body, { metaKey: true })).toBeNull();
    expect(press('t', document.body, { altKey: true })).toBeNull();
  });

  it('does nothing while typing in a field', () => {
    const input = document.createElement('input');
    expect(press('t', input)).toBeNull();
    expect(press(' ', document.createElement('textarea'))).toBeNull();
  });

  it('lets Space press a focused button instead of toggling the timer', () => {
    const button = document.createElement('button');
    expect(press(' ', button)).toBeNull();
    expect(press('m', button)).toBe('mute');
  });

  it('never gives one key two meanings', () => {
    const keys = SHORTCUTS.flatMap((s) => s.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
