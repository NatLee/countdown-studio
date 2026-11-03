import { describe, expect, it } from 'vitest';
import {
  epochToWallTime,
  formatWallTime,
  isValidTimeZone,
  parseWallTime,
  supportedTimeZones,
  wallTimeToEpoch,
} from './zoned';

const wall = (text: string) => {
  const w = parseWallTime(text);
  if (!w) throw new Error(`bad wall time in test: ${text}`);
  return w;
};

describe('parseWallTime / formatWallTime', () => {
  it('reads the datetime-local format with and without seconds', () => {
    expect(parseWallTime('2027-01-01T00:00')).toEqual({
      year: 2027, month: 1, day: 1, hour: 0, minute: 0, second: 0,
    });
    expect(parseWallTime('2027-06-30T23:59:58')?.second).toBe(58);
  });

  it('rejects dates that do not exist and other formats', () => {
    expect(parseWallTime('2027-02-30T10:00')).toBeNull();
    expect(parseWallTime('2027-13-01T10:00')).toBeNull();
    expect(parseWallTime('2027-01-01 10:00')).toBeNull();
    expect(parseWallTime('2027-01-01T24:00')).toBeNull();
    expect(parseWallTime('')).toBeNull();
  });

  it('round-trips and leaves out zero seconds', () => {
    expect(formatWallTime(wall('2027-01-01T00:00'))).toBe('2027-01-01T00:00');
    expect(formatWallTime(wall('2027-01-01T00:00:09'))).toBe('2027-01-01T00:00:09');
  });
});

describe('wallTimeToEpoch', () => {
  it('turns Taipei midnight into 16:00 UTC the day before', () => {
    expect(new Date(wallTimeToEpoch(wall('2027-01-01T00:00'), 'Asia/Taipei')).toISOString()).toBe(
      '2026-12-31T16:00:00.000Z',
    );
  });

  it('handles UTC and zones behind UTC', () => {
    expect(wallTimeToEpoch(wall('2027-01-01T00:00'), 'UTC')).toBe(Date.UTC(2027, 0, 1));
    expect(new Date(wallTimeToEpoch(wall('2027-07-04T09:00'), 'America/New_York')).toISOString()).toBe(
      '2027-07-04T13:00:00.000Z',
    );
  });

  // US clocks jump from 02:00 to 03:00 on 2027-03-14, so 02:30 never happens.
  it('moves a skipped time forward, like Date does', () => {
    expect(new Date(wallTimeToEpoch(wall('2027-03-14T02:30'), 'America/New_York')).toISOString()).toBe(
      '2027-03-14T07:30:00.000Z',
    );
    // Sydney jumps forward on 2027-10-03 (02:00 → 03:00 local).
    expect(new Date(wallTimeToEpoch(wall('2027-10-03T02:30'), 'Australia/Sydney')).toISOString()).toBe(
      '2027-10-02T16:30:00.000Z',
    );
  });

  // Clocks fall back and read 01:30 twice in New York on 2027-11-07, and 02:30 twice in Berlin
  // on 2027-10-31. Both sides of UTC must pick the first reading.
  it('picks the first of two readings when clocks fall back', () => {
    expect(new Date(wallTimeToEpoch(wall('2027-11-07T01:30'), 'America/New_York')).toISOString()).toBe(
      '2027-11-07T05:30:00.000Z',
    );
    expect(new Date(wallTimeToEpoch(wall('2027-10-31T02:30'), 'Europe/Berlin')).toISOString()).toBe(
      '2027-10-31T00:30:00.000Z',
    );
  });

  it('is the inverse of epochToWallTime', () => {
    const zones = ['Asia/Taipei', 'Asia/Kolkata', 'America/St_Johns', 'Pacific/Chatham', 'Europe/London'];
    const instant = Date.UTC(2027, 4, 17, 12, 34, 56);
    for (const zone of zones) {
      expect(wallTimeToEpoch(epochToWallTime(instant, zone), zone)).toBe(instant);
    }
  });
});

describe('time-zone helpers', () => {
  it('validates zone names', () => {
    expect(isValidTimeZone('Asia/Taipei')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('lists zones for the picker, including UTC', () => {
    const zones = supportedTimeZones();
    expect(zones).toContain('UTC');
    expect(zones).toContain('Asia/Taipei');
    expect([...zones].sort()).toEqual(zones);
  });
});
