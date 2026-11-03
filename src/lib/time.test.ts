import { describe, expect, it } from 'vitest';
import {
  HOUR,
  MINUTE,
  SECOND,
  clockGroups,
  describeSeconds,
  displaySeconds,
  formatClock,
  formatDurationText,
  overtimeSeconds,
  parseDurationText,
  splitSeconds,
} from './time';

describe('splitSeconds', () => {
  it('splits into days, hours, minutes and seconds', () => {
    // 58 d 1 h 24 min 7 s – the reading in the old Flask page's screenshot.
    const total = 58 * 86_400 + 1 * 3_600 + 24 * 60 + 7;
    expect(splitSeconds(total)).toEqual({ days: 58, hours: 1, minutes: 24, seconds: 7 });
  });

  it('never goes negative', () => {
    expect(splitSeconds(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('displaySeconds / overtimeSeconds', () => {
  it('rounds up while counting down, like a kitchen timer', () => {
    expect(displaySeconds(400)).toBe(1);
    expect(displaySeconds(1000)).toBe(1);
    expect(displaySeconds(1001)).toBe(2);
    expect(displaySeconds(0)).toBe(0);
    expect(displaySeconds(-3000)).toBe(0);
  });

  it('counts whole seconds past the end', () => {
    expect(overtimeSeconds(500)).toBe(0);
    expect(overtimeSeconds(-999)).toBe(0);
    expect(overtimeSeconds(-61_000)).toBe(61);
  });
});

describe('clockGroups / formatClock', () => {
  it('keeps the old DD:HH:MM:SS layout when there are days left', () => {
    const total = 58 * 86_400 + 3_600 + 24 * 60 + 7;
    expect(clockGroups(total).map((g) => g.digits)).toEqual(['58', '01', '24', '07']);
    expect(formatClock(total)).toBe('58:01:24:07');
  });

  it('drops leading zero groups but always shows minutes and seconds', () => {
    expect(clockGroups(25 * 60).map((g) => g.unit)).toEqual(['minutes', 'seconds']);
    expect(formatClock(25 * 60)).toBe('25:00');
    expect(formatClock(5 * 60)).toBe('5:00');
    expect(formatClock(90 * 60)).toBe('1:30:00');
    expect(formatClock(0)).toBe('0:00');
  });

  it('keeps every digit of long day counts', () => {
    expect(clockGroups(365 * 86_400)[0]).toEqual({ unit: 'days', digits: '365' });
  });
});

describe('describeSeconds', () => {
  it('reads naturally and skips zero parts', () => {
    expect(describeSeconds(86_400 + 3_600 + 5)).toBe('1 day, 1 hour, 5 seconds');
    expect(describeSeconds(120)).toBe('2 minutes');
    expect(describeSeconds(0)).toBe('0 seconds');
  });
});

describe('duration text', () => {
  it('parses the share-link syntax', () => {
    expect(parseDurationText('25m')).toBe(25 * MINUTE);
    expect(parseDurationText('1h30m')).toBe(HOUR + 30 * MINUTE);
    expect(parseDurationText('2d')).toBe(48 * HOUR);
    expect(parseDurationText('90s')).toBe(90 * SECOND);
    expect(parseDurationText(' 1H5S ')).toBe(HOUR + 5 * SECOND);
  });

  it('rejects empty, zero and malformed values', () => {
    for (const bad of ['', '0m', 'm', '10', '5m3h', '1.5h', '-5m', 'abc']) {
      expect(parseDurationText(bad), bad).toBeNull();
    }
  });

  it('formats back to the same syntax', () => {
    expect(formatDurationText(HOUR + 30 * MINUTE)).toBe('1h30m');
    expect(formatDurationText(25 * MINUTE)).toBe('25m');
    expect(formatDurationText(2 * 86_400_000 + 5 * SECOND)).toBe('2d5s');
    for (const text of ['25m', '1h30m', '2d', '90s', '1d2h3m4s']) {
      expect(formatDurationText(parseDurationText(text) as number)).toBe(text === '90s' ? '1m30s' : text);
    }
  });
});
