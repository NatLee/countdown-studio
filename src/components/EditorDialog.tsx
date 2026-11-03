import { CalendarClock, Timer } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { LABEL_MAX } from '../config';
import { MIN_TIMER_MS, newId, sameCountdown, type Countdown } from '../lib/countdown';
import { formatMoment, zoneCity } from '../lib/format';
import { cleanLabel } from '../lib/share';
import { HOUR, MINUTE, SECOND, splitSeconds } from '../lib/time';
import { epochToWallTime, formatWallTime, isValidTimeZone, parseWallTime, supportedTimeZones, wallTimeToEpoch } from '../lib/zoned';
import { Dialog } from './Dialog';
import { Button } from './ui';

interface Draft {
  label: string;
  kind: Countdown['kind'];
  at: string;
  timeZone: string;
  yearly: boolean;
  hours: string;
  minutes: string;
  seconds: string;
}

/** A new countdown starts as "the next full hour, an hour from now" or a 10-minute timer. */
function draftFrom(c: Countdown | null, now: number, viewerZone: string): Draft {
  const nextHour = Math.ceil((now + HOUR) / HOUR) * HOUR;
  const defaults: Draft = {
    label: '',
    kind: 'event',
    at: formatWallTime({ ...epochToWallTime(nextHour, viewerZone), second: 0 }),
    timeZone: viewerZone,
    yearly: false,
    hours: '0',
    minutes: '10',
    seconds: '0',
  };
  if (!c) return defaults;
  if (c.kind === 'event') {
    return { ...defaults, label: c.label, kind: 'event', at: c.at, timeZone: c.timeZone, yearly: c.repeat === 'yearly' };
  }
  const { days, hours, minutes, seconds } = splitSeconds(c.durationMs / SECOND);
  return {
    ...defaults,
    label: c.label,
    kind: 'timer',
    hours: String(days * 24 + hours),
    minutes: String(minutes),
    seconds: String(seconds),
  };
}

const toCount = (text: string) => (text.trim() === '' ? 0 : Number(text));

type Built = { ok: true; countdown: Countdown } | { ok: false; error: string };

/** Turns the form into a countdown, keeping the id (and a timer's running state if its length is unchanged). */
function build(draft: Draft, initial: Countdown | null, now: number): Built {
  const label = cleanLabel(draft.label);
  const id = initial?.id ?? newId();
  if (draft.kind === 'event') {
    const wall = parseWallTime(draft.at);
    if (!wall) return { ok: false, error: 'Pick a date and time.' };
    const timeZone = draft.timeZone.trim();
    if (!isValidTimeZone(timeZone)) return { ok: false, error: `“${timeZone}” is not a time zone. Try one from the list, like Asia/Taipei.` };
    const next: Countdown = {
      kind: 'event',
      id,
      label: label || 'Countdown',
      createdAt: initial?.createdAt ?? now,
      at: formatWallTime(wall),
      timeZone,
      repeat: draft.yearly ? 'yearly' : 'none',
    };
    // A new moment means a new wait: the progress ring starts again from now.
    const sameMoment = initial?.kind === 'event' && initial.at === next.at && initial.timeZone === next.timeZone;
    return { ok: true, countdown: sameMoment ? next : { ...next, createdAt: now } };
  }
  const parts = [draft.hours, draft.minutes, draft.seconds].map(toCount);
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return { ok: false, error: 'Use whole numbers for hours, minutes and seconds.' };
  const durationMs = parts[0] * HOUR + parts[1] * MINUTE + parts[2] * SECOND;
  if (durationMs < MIN_TIMER_MS) return { ok: false, error: 'A timer needs at least one second.' };
  const next: Countdown = {
    kind: 'timer',
    id,
    label: label || 'Timer',
    createdAt: initial?.createdAt ?? now,
    durationMs,
    state: { status: 'idle' },
  };
  const keepState = initial?.kind === 'timer' && initial.durationMs === durationMs;
  return { ok: true, countdown: keepState ? { ...next, state: initial.state } : next };
}

export function EditorDialog({
  initial,
  now,
  viewerZone,
  onSave,
  onClose,
}: {
  initial: Countdown | null;
  now: number;
  viewerZone: string;
  onSave: (countdown: Countdown) => void;
  onClose: () => void;
}) {
  const [openedAt] = useState(now);
  const [draft, setDraft] = useState(() => draftFrom(initial, openedAt, viewerZone));
  const [error, setError] = useState('');
  // Built once: the list has 400-odd zones and the dialog re-renders with every clock tick.
  const [zoneOptions] = useState(() => supportedTimeZones().map((z) => <option key={z} value={z} />));
  const formId = useId();
  const zoneListId = useId();
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };

  const preview = useMemo(() => {
    if (draft.kind !== 'event') return null;
    const wall = parseWallTime(draft.at);
    if (!wall || !isValidTimeZone(draft.timeZone)) return null;
    const epoch = wallTimeToEpoch(wall, draft.timeZone);
    return {
      epoch,
      local: draft.timeZone === viewerZone ? null : formatMoment(epoch, viewerZone),
    };
  }, [draft.kind, draft.at, draft.timeZone, viewerZone]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = build(draft, initial, Date.now());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!initial || !sameCountdown(initial, result.countdown)) {
      onSave(result.countdown);
    }
    onClose();
  };

  const tab = (kind: Draft['kind']) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      draft.kind === kind ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
    }`;

  return (
    <Dialog
      title={initial ? 'Edit countdown' : 'New countdown'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>
            {initial ? 'Save' : 'Add countdown'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
        <label className="field">
          <span>Name</span>
          <input
            value={draft.label}
            maxLength={LABEL_MAX}
            placeholder={draft.kind === 'event' ? 'Launch day' : 'Focus'}
            onChange={(e) => set({ label: e.target.value })}
            data-autofocus
          />
        </label>

        <div role="radiogroup" aria-label="Count down to" className="flex gap-1 rounded-xl border border-line bg-raised p-1">
          <button type="button" role="radio" aria-checked={draft.kind === 'event'} className={tab('event')} onClick={() => set({ kind: 'event' })}>
            <CalendarClock size={16} /> A moment
          </button>
          <button type="button" role="radio" aria-checked={draft.kind === 'timer'} className={tab('timer')} onClick={() => set({ kind: 'timer' })}>
            <Timer size={16} /> A length of time
          </button>
        </div>

        {draft.kind === 'event' ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Date and time</span>
                <input type="datetime-local" value={draft.at} onChange={(e) => set({ at: e.target.value })} required />
              </label>
              <label className="field">
                <span>Time zone</span>
                <input list={zoneListId} value={draft.timeZone} spellCheck={false} onChange={(e) => set({ timeZone: e.target.value })} />
                <datalist id={zoneListId}>{zoneOptions}</datalist>
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--cs-accent)]" checked={draft.yearly} onChange={(e) => set({ yearly: e.target.checked })} />
              Repeat every year (birthdays, New Year…)
            </label>
            {preview && (
              <p className="rounded-xl bg-raised px-4 py-3 text-sm text-muted">
                {preview.epoch <= openedAt && !draft.yearly ? 'Already passed: ' : 'Counts down to '}
                <span className="text-ink">{formatMoment(preview.epoch, draft.timeZone)}</span> in {zoneCity(draft.timeZone)}
                {preview.local && (
                  <>
                    {' '}
                    — that is <span className="text-ink">{preview.local}</span> for you.
                  </>
                )}
              </p>
            )}
          </div>
        ) : (
          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="sr-only">Length</legend>
            {(
              [
                ['hours', 'Hours'],
                ['minutes', 'Minutes'],
                ['seconds', 'Seconds'],
              ] as const
            ).map(([key, name]) => (
              <label key={key} className="field">
                <span>{name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className="tabular-nums"
                />
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-tally">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
