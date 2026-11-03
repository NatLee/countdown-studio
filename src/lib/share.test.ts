import { describe, expect, it } from 'vitest';
import { startTimer, type Countdown, type EventCountdown, type TimerCountdown } from './countdown';
import { parseShareQuery, shareQuery, shareUrl, withoutShareParams } from './share';
import { MINUTE } from './time';

const NOW = Date.UTC(2026, 10, 4, 1, 0, 0);

const event: EventCountdown = {
  kind: 'event',
  id: 'e1',
  label: 'New Year',
  createdAt: 0,
  at: '2027-01-01T00:00',
  timeZone: 'Asia/Taipei',
  repeat: 'yearly',
};

const timer: TimerCountdown = {
  kind: 'timer',
  id: 't1',
  label: 'Focus',
  createdAt: 0,
  durationMs: 25 * MINUTE,
  state: { status: 'idle' },
};

const parseOk = (search: string, tz = 'Asia/Taipei'): Countdown => {
  const result = parseShareQuery(search, NOW, tz);
  if (!result?.ok) throw new Error(`expected a countdown from ${search}: ${JSON.stringify(result)}`);
  return result.countdown;
};

describe('shareQuery', () => {
  it('writes a moment as wall time plus time zone', () => {
    expect(shareQuery(event, NOW)).toBe('to=2027-01-01T00:00&tz=Asia/Taipei&repeat=yearly&title=New+Year');
  });

  it('writes an idle timer as its length', () => {
    expect(shareQuery(timer, NOW)).toBe('for=25m&title=Focus');
  });

  it('writes a running timer as its end instant, so everyone sees the same countdown', () => {
    const running = startTimer(timer, NOW + 400);
    expect(shareQuery(running, NOW + 1000)).toBe('to=2026-11-04T01:25:01Z&title=Focus');
  });

  it('builds a full link on the current path', () => {
    const url = shareUrl(timer, NOW, { origin: 'https://example.com', pathname: '/countdown-studio/' });
    expect(url).toBe('https://example.com/countdown-studio/?for=25m&title=Focus');
  });
});

describe('parseShareQuery', () => {
  it('ignores ordinary visits', () => {
    expect(parseShareQuery('', NOW, 'UTC')).toBeNull();
    expect(parseShareQuery('?utm_source=x', NOW, 'UTC')).toBeNull();
  });

  it('round-trips every kind of countdown', () => {
    const backEvent = parseOk(shareQuery(event, NOW));
    expect(backEvent).toMatchObject({ kind: 'event', label: 'New Year', at: '2027-01-01T00:00', timeZone: 'Asia/Taipei', repeat: 'yearly' });

    const backTimer = parseOk(shareQuery(timer, NOW));
    expect(backTimer).toMatchObject({ kind: 'timer', label: 'Focus', durationMs: 25 * MINUTE, state: { status: 'idle' } });
  });

  it('turns an exact instant into the viewer’s own wall time', () => {
    const c = parseOk('?to=2026-11-04T01:25:01Z&title=Focus', 'Asia/Taipei');
    expect(c).toMatchObject({ kind: 'event', at: '2026-11-04T09:25:01', timeZone: 'Asia/Taipei', repeat: 'none' });
    const offset = parseOk('?to=2026-11-04T09:25:00%2B08:00', 'UTC');
    expect(offset).toMatchObject({ at: '2026-11-04T01:25', timeZone: 'UTC' });
  });

  it('uses the viewer’s zone when the link has none, and fills in a label', () => {
    expect(parseOk('?to=2027-05-01T12:00', 'Europe/Paris')).toMatchObject({ timeZone: 'Europe/Paris', label: 'Countdown' });
    expect(parseOk('?for=90s')).toMatchObject({ label: 'Timer', durationMs: 90_000 });
  });

  it('cleans up labels', () => {
    expect(parseOk(`?for=5m&title=${encodeURIComponent('  Tea   time ')}`).label).toBe('Tea time');
    expect(parseOk(`?for=5m&title=${'x'.repeat(200)}`).label).toHaveLength(80);
  });

  it('explains what is wrong with a broken link', () => {
    const cases: [string, RegExp][] = [
      ['?for=soon', /not a length of time/],
      ['?to=tomorrow', /not a date/],
      ['?to=2027-02-30T00:00', /not a date/],
      ['?to=2027-01-01T00:00&tz=Mars/Base', /not a time zone/],
      ['?to=2027-01-01T00:00&for=5m', /one of them/],
    ];
    for (const [search, message] of cases) {
      const result = parseShareQuery(search, NOW, 'UTC');
      expect(result?.ok, search).toBe(false);
      if (result && !result.ok) expect(result.error).toMatch(message);
    }
  });
});

describe('withoutShareParams', () => {
  it('removes only the countdown parameters', () => {
    expect(withoutShareParams('https://x.dev/app/?for=5m&title=Tea&lang=en#top')).toBe('https://x.dev/app/?lang=en#top');
  });
});
