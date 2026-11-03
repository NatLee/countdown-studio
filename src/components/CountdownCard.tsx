import { CalendarClock, Expand, Pause, Pencil, Play, RotateCcw, Share2, Trash2 } from 'lucide-react';
import type { Countdown, Snapshot, Status } from '../lib/countdown';
import { describeCountdown } from '../lib/format';
import { displaySeconds, overtimeSeconds } from '../lib/time';
import { ClockFace, FinishedFace } from './ClockFace';
import { FinishBurst } from './FinishBurst';
import { ProgressRing } from './ProgressRing';
import { IconButton } from './ui';

const STATUS_TEXT: Record<Status, string> = {
  counting: 'Live',
  idle: 'Ready',
  paused: 'Paused',
  finished: 'Time’s up',
};

/** The studio "tally light": red and pulsing while live, like a camera that is on air. */
export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill pill-${status}`}>
      <span className="tally" aria-hidden="true" />
      {STATUS_TEXT[status]}
    </span>
  );
}

export interface CardActions {
  onSelect: () => void;
  onToggle: () => void;
  onReset: () => void;
  onStage: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CountdownCard({
  countdown: c,
  snap,
  selected,
  flip,
  celebrate,
  featured = false,
  actions,
}: {
  countdown: Countdown;
  snap: Snapshot;
  selected: boolean;
  /** The only countdown on the page: spans the whole row with bigger digits. */
  featured?: boolean;
  flip: boolean;
  celebrate: boolean;
  actions: CardActions;
}) {
  const finished = snap.status === 'finished';
  const isTimer = c.kind === 'timer';
  const titleId = `card-title-${c.id}`;
  const percent = Math.floor(snap.progress * 100);

  return (
    <article
      aria-labelledby={titleId}
      aria-current={selected || undefined}
      onClick={actions.onSelect}
      className={`card group relative flex flex-col overflow-hidden rounded-3xl border p-5 transition ${
        selected ? 'border-accent/70 card-selected' : 'border-line hover:border-muted/50'
      } ${finished ? 'card-finished' : ''} ${featured ? 'sm:col-span-full sm:p-8' : ''}`}
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-lg leading-tight font-semibold">
            {c.label}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{describeCountdown(c, snap)}</p>
        </div>
        <StatusPill status={snap.status} />
      </header>

      <div className="@container relative my-6 flex min-h-24 flex-1 items-center justify-center">
        {finished ? (
          <FinishedFace overtime={overtimeSeconds(snap.remainingMs)} variant={featured ? 'feature' : 'card'} />
        ) : (
          <ClockFace seconds={displaySeconds(snap.remainingMs)} variant={featured ? 'feature' : 'card'} flip={flip} />
        )}
      </div>

      <footer className="flex items-center gap-3">
        <ProgressRing progress={snap.progress} className="size-12 shrink-0">
          {isTimer ? (
            <button
              type="button"
              onClick={actions.onToggle}
              aria-label={snap.status === 'counting' ? `Pause ${c.label}` : `Start ${c.label}`}
              title={snap.status === 'counting' ? 'Pause (Space)' : 'Start (Space)'}
              className="grid size-9 place-items-center rounded-full bg-accent text-on-accent transition hover:brightness-110"
            >
              {snap.status === 'counting' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-px" />}
            </button>
          ) : (
            <CalendarClock size={18} className="text-accent" aria-hidden="true" />
          )}
        </ProgressRing>
        <div className="min-w-0 text-xs leading-snug text-muted">
          <span className="font-semibold text-ink tabular-nums">{percent}%</span> {isTimer ? 'done' : 'of the wait'}
        </div>
        <div className="ml-auto flex items-center">
          {isTimer && (
            <IconButton label={`Reset ${c.label}`} onClick={actions.onReset} disabled={snap.status === 'idle'}>
              <RotateCcw size={17} />
            </IconButton>
          )}
          <IconButton label={`Present ${c.label} full screen`} onClick={actions.onStage}>
            <Expand size={17} />
          </IconButton>
          <IconButton label={`Share ${c.label}`} onClick={actions.onShare}>
            <Share2 size={17} />
          </IconButton>
          <IconButton label={`Edit ${c.label}`} onClick={actions.onEdit}>
            <Pencil size={17} />
          </IconButton>
          <IconButton label={`Delete ${c.label}`} onClick={actions.onDelete} className="hover:text-tally">
            <Trash2 size={17} />
          </IconButton>
        </div>
      </footer>

      {celebrate && <FinishBurst />}
    </article>
  );
}
