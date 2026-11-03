import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

function fakeWakeLock() {
  const sentinels: { released: boolean; release: ReturnType<typeof vi.fn> }[] = [];
  const request = vi.fn(async () => {
    const sentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true;
      }),
    };
    sentinels.push(sentinel);
    return sentinel;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it('holds the screen on while active and lets go when it stops', async () => {
    const { request, sentinels } = fakeWakeLock();
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: false } });
    expect(request).not.toHaveBeenCalled();

    await act(async () => rerender({ active: true }));
    expect(request).toHaveBeenCalledWith('screen');

    await act(async () => rerender({ active: false }));
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('asks again when the tab comes back (browsers drop the lock in hidden tabs)', async () => {
    const { request, sentinels } = fakeWakeLock();
    renderHook(() => useWakeLock(true));
    await act(async () => undefined);
    expect(request).toHaveBeenCalledTimes(1);
    sentinels[0].released = true;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does nothing in browsers without the API', () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});
