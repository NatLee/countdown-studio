import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './config';

// 2026-11-04 09:00:00 in Taipei (the test time zone, see vite.config.ts).
const T0 = Date.UTC(2026, 10, 4, 1, 0, 0);

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
  // The fake clock also moves with real time, so Testing Library's own short waits still finish.
  vi.useFakeTimers({ now: T0, shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<App />);
  return user;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function card(name: string): HTMLElement {
  return screen.getByRole('article', { name });
}

/** What a clock face shows, e.g. "25:00" (the digits only, units left out). */
function shownTime(container: HTMLElement): string {
  const timer = within(container).getByRole('timer');
  return [...timer.querySelectorAll('.clock-digits')].map((g) => g.textContent).join(':');
}

function save(countdowns: unknown[], extra: Record<string, unknown> = {}) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      selectedId: null,
      settings: { theme: 'neon', volume: 0.5, muted: false, notify: false, keepAwake: true },
      countdowns,
      ...extra,
    }),
  );
}

const timer = (id: string, label: string, durationMs: number, state: object = { status: 'idle' }) => ({
  kind: 'timer',
  id,
  label,
  createdAt: T0,
  durationMs,
  state,
});

describe('first visit', () => {
  it('counts down to New Year in the visitor’s time zone, like the old page', () => {
    setup();
    const newYear = card('New Year');
    // From 2026-11-04 09:00 to 2027-01-01 00:00 in Taipei.
    expect(shownTime(newYear)).toBe('57:15:00:00');
    expect(within(newYear).getByText(/Fri, Jan 1, 2027, 00:00 · Taipei · every year/)).toBeInTheDocument();
    expect(document.title).toBe('57:15:00:00 · New Year');
  });
});

describe('timers', () => {
  it('adds a preset, starts with Space and stays exact when the tab sleeps', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /Pomodoro/ }));
    const focus = card('Focus');
    expect(shownTime(focus)).toBe('25:00');
    expect(focus).toHaveAttribute('aria-current', 'true');

    // Space on the focused chip would press the chip again (that is the browser's job), so
    // move focus away first, as clicking elsewhere would.
    act(() => (document.activeElement as HTMLElement).blur());
    await user.keyboard(' ');
    // Half a second past the minute: the screen refreshes every TICK_MS, so this stays clear of
    // the moment the digit changes.
    advance(61_500);
    expect(shownTime(focus)).toBe('23:59');
    expect(within(focus).getByText('Live')).toBeInTheDocument();

    // A background tab can go minutes without running any timer. Jump the clock without ticking:
    // the next look (here: the tab becoming visible) is still exact.
    vi.setSystemTime(Date.now() + 10 * 60_000);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(shownTime(focus)).toBe('13:59');
  });

  it('pauses and resumes from the ring button without losing time', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /Break/ }));
    const breakCard = card('Break');
    await user.click(within(breakCard).getByRole('button', { name: 'Start Break' }));
    advance(30_500);
    await user.click(within(breakCard).getByRole('button', { name: 'Pause Break' }));
    advance(5 * 60_000);
    expect(shownTime(breakCard)).toBe('04:30');
    expect(within(breakCard).getByText('Paused')).toBeInTheDocument();
    await user.click(within(breakCard).getByRole('button', { name: 'Start Break' }));
    advance(30_000);
    expect(shownTime(breakCard)).toBe('04:00');
  });

  it('beeps, says time is up and shows the overtime when a timer ends', () => {
    save([timer('t', 'Tea', 3000, { status: 'running', endsAt: T0 + 2000 })], { selectedId: 't' });
    setup();
    expect(play).not.toHaveBeenCalled();
    advance(2000);
    const tea = card('Tea');
    expect(within(tea).getByText('Time’s up!')).toBeInTheDocument();
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Time’s up: Tea')).toBeInTheDocument();
    expect(document.title).toBe('Time’s up! · Tea');
    advance(42_000);
    expect(within(tea).getByText('+0:42')).toBeInTheDocument();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays quiet about countdowns that ended while the page was closed, and when muted', () => {
    save([
      timer('old', 'Old', 3000, { status: 'running', endsAt: T0 - 60_000 }),
      timer('new', 'New', 3000, { status: 'running', endsAt: T0 + 1000 }),
    ]);
    localStorage.setItem(
      STORAGE_KEY,
      localStorage.getItem(STORAGE_KEY)!.replace('"muted":false', '"muted":true'),
    );
    setup();
    expect(within(card('Old')).getByText('Time’s up!')).toBeInTheDocument();
    advance(1500);
    expect(within(card('New')).getByText('Time’s up!')).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });
});

describe('keyboard', () => {
  it('switches theme, selects with arrows, adjusts with + and ignores keys while typing', async () => {
    save([timer('a', 'Alpha', 60_000), timer('b', 'Bravo', 60_000)], { selectedId: 'a' });
    const user = setup();
    await user.keyboard('t');
    expect(document.documentElement.dataset.theme).toBe('minimal');
    await user.keyboard('{ArrowRight}');
    expect(card('Bravo')).toHaveAttribute('aria-current', 'true');
    await user.keyboard('+');
    expect(shownTime(card('Bravo'))).toBe('02:00');
    await user.keyboard('-');
    await user.keyboard('-');
    expect(shownTime(card('Bravo'))).toBe('00:01');

    await user.keyboard('n');
    const dialog = screen.getByRole('dialog', { name: 'New countdown' });
    await user.type(within(dialog).getByLabelText('Name'), 'tnt');
    expect(document.documentElement.dataset.theme).toBe('minimal');
  });

  it('opens stage mode with F and leaves it with Esc', async () => {
    const user = setup();
    await user.keyboard('f');
    const stage = screen.getByRole('dialog', { name: 'Stage: New Year' });
    expect(within(stage).getByRole('timer')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Stage: New Year' })).not.toBeInTheDocument();
  });

  it('lists every shortcut in the help dialog', async () => {
    const user = setup();
    await user.keyboard('?');
    const help = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(help).getByText('Start or pause the selected timer')).toBeInTheDocument();
    expect(within(help).getByText('Leave stage mode or close a dialog')).toBeInTheDocument();
  });
});

describe('editing', () => {
  it('creates a countdown to a moment in another time zone', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'New countdown' }));
    const dialog = screen.getByRole('dialog', { name: 'New countdown' });
    await user.type(within(dialog).getByLabelText('Name'), 'Launch');
    fireEvent.change(within(dialog).getByLabelText('Date and time'), { target: { value: '2026-11-04T09:00' } });
    const zone = within(dialog).getByLabelText('Time zone');
    await user.clear(zone);
    await user.type(zone, 'America/New_York');
    // 09:00 in New York is 22:00 the same day in Taipei.
    expect(within(dialog).getByText(/Wed, Nov 4, 2026, 22:00/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add countdown' }));

    const launch = card('Launch');
    expect(shownTime(launch)).toBe('13:00:00');
    expect(within(launch).getByText(/New York/)).toBeInTheDocument();
  });

  it('turns an invalid time zone into a readable error', async () => {
    const user = setup();
    await user.keyboard('n');
    const dialog = screen.getByRole('dialog', { name: 'New countdown' });
    const zone = within(dialog).getByLabelText('Time zone');
    await user.clear(zone);
    await user.type(zone, 'Moon/Base');
    await user.click(within(dialog).getByRole('button', { name: 'Add countdown' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('“Moon/Base” is not a time zone');
  });

  it('deletes with undo', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Delete New Year' }));
    expect(screen.queryByRole('article', { name: 'New Year' })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing on air.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(card('New Year')).toBeInTheDocument();
  });
});

describe('sharing and saving', () => {
  it('adds a countdown from a share link, then tidies the address bar', () => {
    window.history.replaceState(null, '', '/?for=25m&title=Tea&utm=x');
    setup();
    expect(shownTime(card('Tea'))).toBe('25:00');
    expect(screen.getByText('Added “Tea” from a shared link.')).toBeInTheDocument();
    expect(window.location.search).toBe('?utm=x');
  });

  it('explains a broken share link', () => {
    window.history.replaceState(null, '', '/?for=soon');
    setup();
    expect(screen.getByText(/That share link did not work/)).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('shows a link that carries a running timer’s end time', async () => {
    save([timer('f', 'Focus', 25 * 60_000, { status: 'running', endsAt: T0 + 25 * 60_000 })], { selectedId: 'f' });
    const user = setup();
    await user.keyboard('s');
    const dialog = screen.getByRole('dialog', { name: 'Share “Focus”' });
    expect(within(dialog).getByRole('textbox')).toHaveValue('http://localhost:3000/?to=2026-11-04T01:25:00Z&title=Focus');
  });

  it('remembers countdowns and settings across visits', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /Exam/ }));
    await user.keyboard('m');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.countdowns.map((c: { label: string }) => c.label)).toEqual(['New Year', 'Exam']);
    expect(saved.settings.muted).toBe(true);
  });
});
