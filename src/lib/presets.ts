/** One-click countdowns. Each preset builds a fresh countdown when it is used. */
import { HOUR, MINUTE } from './time';
import { newId, type Countdown } from './countdown';
import { epochToWallTime } from './zoned';

export interface Preset {
  id: string;
  name: string;
  /** Short hint shown next to the name. */
  hint: string;
  create: (now: number, timeZone: string) => Countdown;
}

const timer = (label: string, durationMs: number) => (now: number): Countdown => ({
  kind: 'timer',
  id: newId(),
  label,
  createdAt: now,
  durationMs,
  state: { status: 'idle' },
});

/** The countdown the old Flask page showed: the next 1 January, 00:00, every year. */
export function newYearCountdown(now: number, timeZone: string): Countdown {
  const year = epochToWallTime(now, timeZone).year + 1;
  return {
    kind: 'event',
    id: newId(),
    label: 'New Year',
    createdAt: now,
    at: `${year}-01-01T00:00`,
    timeZone,
    repeat: 'yearly',
  };
}

export const PRESETS: Preset[] = [
  { id: 'pomodoro', name: 'Pomodoro', hint: '25 min', create: timer('Focus', 25 * MINUTE) },
  { id: 'break', name: 'Break', hint: '5 min', create: timer('Break', 5 * MINUTE) },
  { id: 'meeting', name: 'Meeting', hint: '30 min', create: timer('Meeting', 30 * MINUTE) },
  { id: 'exam', name: 'Exam', hint: '2 h', create: timer('Exam', 2 * HOUR) },
  { id: 'new-year', name: 'New Year', hint: 'every 1 Jan', create: newYearCountdown },
];
