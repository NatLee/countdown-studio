import { ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { STAGE_IDLE_MS } from '../config';
import type { Countdown, Snapshot } from '../lib/countdown';
import { describeCountdown } from '../lib/format';
import { displaySeconds, overtimeSeconds } from '../lib/time';
import { ClockFace, FinishedFace } from './ClockFace';
import { StatusPill } from './CountdownCard';
import { FinishBurst } from './FinishBurst';
import { ProgressRing } from './ProgressRing';
import { IconButton } from './ui';

/**
 * Stage mode: one countdown, as big as the screen allows. It asks for full screen when it opens
 * and closes when full screen ends (Esc), so one key gets you out. Where full screen is not
 * available (iPhone Safari) it still covers the window. Controls hide when the mouse rests.
 */
export function Stage({
  countdown: c,
  snap,
  flip,
  celebrate,
  canStep,
  onClose,
  onToggle,
  onReset,
  onAdjust,
  onStep,
}: {
  countdown: Countdown;
  snap: Snapshot;
  flip: boolean;
  celebrate: boolean;
  canStep: boolean;
  onClose: () => void;
  onToggle: () => void;
  onReset: () => void;
  onAdjust: (direction: 1 | -1) => void;
  onStep: (step: 1 | -1) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [idle, setIdle] = useState(false);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const el = root.current;
    let entered = false;
    const onChange = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) close();
    };
    document.addEventListener('fullscreenchange', onChange);
    el?.requestFullscreen?.().catch(() => undefined);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), STAGE_IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), STAGE_IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const finished = snap.status === 'finished';
  const isTimer = c.kind === 'timer';

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Stage: ${c.label}`}
      className={`stage fixed inset-0 z-20 flex flex-col bg-bg text-ink ${idle ? 'stage-idle' : ''}`}
    >
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pt-[max(2rem,env(safe-area-inset-top))] text-center">
        <StatusPill status={snap.status} />
        <h2 className="stage-title max-w-full truncate font-semibold">{c.label}</h2>
        <p className="text-sm text-muted sm:text-base">{describeCountdown(c, snap)}</p>
      </div>

      <div className="stage-body relative grid flex-1 place-items-center">
        <ProgressRing progress={snap.progress} size={1000} stroke={6} className="stage-ring" />
        <div className="relative z-10 w-full px-[3cqw]">
          {finished ? (
            <FinishedFace overtime={overtimeSeconds(snap.remainingMs)} variant="stage" />
          ) : (
            <ClockFace seconds={displaySeconds(snap.remainingMs)} variant="stage" flip={flip} />
          )}
        </div>
        {celebrate && <FinishBurst />}
      </div>

      <div className="stage-controls relative z-10 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface/80 p-1.5 shadow-2xl backdrop-blur">
          <IconButton label="Previous countdown (←)" onClick={() => onStep(-1)} disabled={!canStep}>
            <ChevronLeft size={20} />
          </IconButton>
          {isTimer && (
            <>
              <IconButton label="Take a minute off (−)" onClick={() => onAdjust(-1)} disabled={finished}>
                <Minus size={18} />
              </IconButton>
              <button
                type="button"
                onClick={onToggle}
                aria-label={snap.status === 'counting' ? 'Pause (Space)' : 'Start (Space)'}
                title={snap.status === 'counting' ? 'Pause (Space)' : 'Start (Space)'}
                className="mx-1 grid size-11 place-items-center rounded-xl bg-accent text-on-accent transition hover:brightness-110"
              >
                {snap.status === 'counting' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <IconButton label="Add a minute (+)" onClick={() => onAdjust(1)} disabled={finished}>
                <Plus size={18} />
              </IconButton>
              <IconButton label="Reset (R)" onClick={onReset} disabled={snap.status === 'idle'}>
                <RotateCcw size={18} />
              </IconButton>
            </>
          )}
          <IconButton label="Next countdown (→)" onClick={() => onStep(1)} disabled={!canStep}>
            <ChevronRight size={20} />
          </IconButton>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <IconButton label="Leave stage mode (Esc)" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
