import { CodeXml, Keyboard, Plus, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useState } from 'react';
import { WallClock } from './components/ClockFace';
import { CountdownCard } from './components/CountdownCard';
import { EditorDialog } from './components/EditorDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { ShareDialog } from './components/ShareDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Stage } from './components/Stage';
import { ThemePicker } from './components/ThemePicker';
import { Toast, type ToastData } from './components/Toast';
import { Button, IconButton, Kbd } from './components/ui';
import { APP_NAME, REPO_URL, STORAGE_KEY } from './config';
import { useFinishAlarms } from './hooks/useFinishAlarms';
import { useNow } from './hooks/useNow';
import { useShortcuts } from './hooks/useShortcuts';
import { useWakeLock } from './hooks/useWakeLock';
import { playBeep, showNotification } from './lib/alarm';
import { ADJUST_STEP_MS, snapshot, type Countdown } from './lib/countdown';
import { formatTimeOfDay, zoneCity } from './lib/format';
import { PRESETS } from './lib/presets';
import { withoutShareParams } from './lib/share';
import type { ShortcutAction } from './lib/shortcuts';
import { deserializeState, loadState, safeStorage, saveState } from './lib/storage';
import { nextTheme, themeById } from './lib/themes';
import { displaySeconds, formatClock } from './lib/time';
import { localTimeZone } from './lib/zoned';
import { bootState, reducer, selectedCountdown, type BootNotice } from './state/appState';

type DialogState =
  | { type: 'new' }
  | { type: 'edit'; id: string }
  | { type: 'share'; id: string }
  | { type: 'settings' }
  | { type: 'help' }
  | null;

let toastSeq = 0;

function bootMessage(notice: BootNotice): string {
  switch (notice.kind) {
    case 'added':
      return `Added “${notice.label}” from a shared link.`;
    case 'existing':
      return `“${notice.label}” from the link is already in your list.`;
    case 'error':
      return `That share link did not work: ${notice.message}`;
  }
}

/** Tab title: the selected countdown's time left, as the old page did. */
function titleFor(c: Countdown | null, now: number): string {
  if (!c) return APP_NAME;
  const snap = snapshot(c, now);
  if (snap.status === 'finished') return `Time’s up! · ${c.label}`;
  return `${formatClock(displaySeconds(snap.remainingMs))} · ${c.label}`;
}

export default function App() {
  const [viewerZone] = useState(localTimeZone);
  const [boot] = useState(() =>
    bootState(loadState(safeStorage(), STORAGE_KEY), window.location.search, Date.now(), viewerZone),
  );
  const [state, dispatch] = useReducer(reducer, boot.state);
  const now = useNow();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [staging, setStaging] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(() => {
    const { notice } = boot;
    if (!notice) return null;
    const undo = notice.kind === 'added' ? { label: 'Undo', run: () => dispatch({ type: 'remove', id: notice.id }) } : undefined;
    return { id: ++toastSeq, message: bootMessage(notice), action: undo };
  });
  const [celebrating, setCelebrating] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState('');

  const { settings } = state;
  const theme = themeById(settings.theme);
  const selected = selectedCountdown(state);
  const notify = useCallback((message: string, action?: ToastData['action']) => {
    toastSeq += 1;
    setToast({ id: toastSeq, message, action });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  // Remember everything in this browser, and follow changes made in other tabs (a second
  // window on a projector can show stage mode while you control it from here).
  useEffect(() => saveState(safeStorage(), STORAGE_KEY, state), [state]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = deserializeState(event.newValue);
      if (next) dispatch({ type: 'replace', state: next });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Before paint, so a saved theme does not flash the default one first.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme.id;
  }, [theme.id]);

  // A share link is read once at start-up (see bootState); then the URL is tidied so a reload
  // does not add it again.
  useEffect(() => {
    if (boot.notice) window.history.replaceState(window.history.state, '', withoutShareParams(window.location.href));
  }, [boot]);

  const title = titleFor(selected, now);
  useEffect(() => {
    document.title = title;
  }, [title]);

  useFinishAlarms(state.countdowns, (c) => {
    if (!settings.muted) void playBeep(settings.volume);
    if (settings.notify && !document.hasFocus()) showNotification(`Time’s up: ${c.label}`, APP_NAME);
    setAnnouncement(`Time’s up: ${c.label}`);
    setCelebrating((prev) => new Set(prev).add(c.id));
  });

  const anyTimerRunning = state.countdowns.some((c) => c.kind === 'timer' && snapshot(c, now).status === 'counting');
  useWakeLock(settings.keepAwake && (staging || anyTimerRunning));

  const timerOp = (id: string, op: 'toggle' | 'reset') => dispatch({ type: 'timer', id, op, now: Date.now() });
  const adjust = (id: string, direction: 1 | -1) =>
    dispatch({ type: 'adjust', id, deltaMs: direction * ADJUST_STEP_MS, now: Date.now() });
  const remove = (c: Countdown) => {
    const index = state.countdowns.findIndex((x) => x.id === c.id);
    dispatch({ type: 'remove', id: c.id });
    if (state.countdowns.length === 1) setStaging(false);
    notify(`Deleted “${c.label}”.`, { label: 'Undo', run: () => dispatch({ type: 'restore', countdown: c, index }) });
  };
  const setMuted = (muted: boolean) => {
    dispatch({ type: 'settings', patch: { muted } });
    notify(muted ? 'Sound off.' : 'Sound on.');
  };

  const dialogTarget = dialog && 'id' in dialog ? state.countdowns.find((c) => c.id === dialog.id) : undefined;
  // A dialog whose countdown was deleted (say, from another tab) is not shown, so it must not block the keys.
  const dialogOpen = dialog !== null && (!('id' in dialog) || dialogTarget !== undefined);

  useShortcuts(!dialogOpen, (action: ShortcutAction) => {
    const c = selected;
    switch (action) {
      case 'new':
        return setDialog({ type: 'new' });
      case 'help':
        return setDialog({ type: 'help' });
      case 'theme':
        return dispatch({ type: 'settings', patch: { theme: nextTheme(settings.theme) } });
      case 'mute':
        return setMuted(!settings.muted);
      case 'prev':
        return dispatch({ type: 'selectStep', step: -1 });
      case 'next':
        return dispatch({ type: 'selectStep', step: 1 });
    }
    if (!c) return;
    switch (action) {
      case 'stage':
        return setStaging((s) => !s);
      case 'edit':
        return setDialog({ type: 'edit', id: c.id });
      case 'share':
        return setDialog({ type: 'share', id: c.id });
      case 'toggle':
        return timerOp(c.id, 'toggle');
      case 'reset':
        return timerOp(c.id, 'reset');
      case 'add':
        return adjust(c.id, 1);
      case 'subtract':
        return adjust(c.id, -1);
    }
  });

  const anyLive = state.countdowns.some((c) => snapshot(c, now).status === 'counting');
  const stageCountdown = staging ? selected : null;

  return (
    <div className="app-backdrop flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <h1 className="text-xl leading-none font-extrabold tracking-tight sm:text-2xl">
              Countdown <span className="text-accent">Studio</span>
            </h1>
            <p className={`on-air mt-1.5 ${anyLive ? 'on-air-live' : ''}`}>
              <span className="tally" aria-hidden="true" /> {anyLive ? 'On air' : 'Standing by'}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2.5 text-muted md:flex">
          <WallClock time={formatTimeOfDay(now, true)} label={`Local time in ${zoneCity(viewerZone)}`} />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase">{zoneCity(viewerZone)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemePicker compact value={settings.theme} onChange={(id) => dispatch({ type: 'settings', patch: { theme: id } })} />
          </div>
          <IconButton label="Settings" onClick={() => setDialog({ type: 'settings' })}>
            <Settings2 size={19} />
          </IconButton>
          <IconButton label="Keyboard shortcuts (?)" onClick={() => setDialog({ type: 'help' })}>
            <Keyboard size={19} />
          </IconButton>
        </div>
      </header>

      <nav aria-label="Quick add" className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 sm:px-6">
        <Button variant="primary" onClick={() => setDialog({ type: 'new' })}>
          <Plus size={17} strokeWidth={2.5} /> New countdown
        </Button>
        <span className="mx-2 hidden text-xs font-bold tracking-[0.2em] text-muted uppercase sm:inline">or quick add</span>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" onClick={() => dispatch({ type: 'add', countdown: p.create(Date.now(), viewerZone) })}>
            {p.name} <span className="text-muted">{p.hint}</span>
          </button>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {state.countdowns.length === 0 ? (
          <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
            <p className="font-digits text-6xl text-accent">00:00</p>
            <p className="mt-4 text-lg font-semibold">Nothing on air.</p>
            <p className="mt-1 text-muted">Start a new countdown, or pick one of the quick adds above.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {state.countdowns.map((c) => {
              const snap = snapshot(c, now);
              return (
                <CountdownCard
                  key={c.id}
                  countdown={c}
                  snap={snap}
                  selected={c.id === selected?.id}
                  flip={theme.flip}
                  celebrate={celebrating.has(c.id) && snap.status === 'finished'}
                  featured={state.countdowns.length === 1}
                  actions={{
                    onSelect: () => dispatch({ type: 'select', id: c.id }),
                    onToggle: () => timerOp(c.id, 'toggle'),
                    onReset: () => timerOp(c.id, 'reset'),
                    onStage: () => setStaging(true),
                    onShare: () => setDialog({ type: 'share', id: c.id }),
                    onEdit: () => setDialog({ type: 'edit', id: c.id }),
                    onDelete: () => remove(c),
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pb-8 text-sm text-muted sm:px-6">
        <span>Your countdowns stay in this browser. Nothing is sent anywhere.</span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          Press <Kbd>?</Kbd> for shortcuts
        </span>
        <a href={REPO_URL} className="ml-auto inline-flex items-center gap-1.5 hover:text-ink">
          <CodeXml size={16} /> Source on GitHub
        </a>
      </footer>

      {stageCountdown && (
        <Stage
          countdown={stageCountdown}
          snap={snapshot(stageCountdown, now)}
          flip={theme.flip}
          celebrate={celebrating.has(stageCountdown.id) && snapshot(stageCountdown, now).status === 'finished'}
          canStep={state.countdowns.length > 1}
          onClose={() => setStaging(false)}
          onToggle={() => timerOp(stageCountdown.id, 'toggle')}
          onReset={() => timerOp(stageCountdown.id, 'reset')}
          onAdjust={(direction) => adjust(stageCountdown.id, direction)}
          onStep={(step) => dispatch({ type: 'selectStep', step })}
        />
      )}

      {dialog?.type === 'new' && (
        <EditorDialog
          initial={null}
          now={now}
          viewerZone={viewerZone}
          onSave={(c) => dispatch({ type: 'add', countdown: c })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'edit' && dialogTarget && (
        <EditorDialog
          initial={dialogTarget}
          now={now}
          viewerZone={viewerZone}
          onSave={(c) => dispatch({ type: 'update', countdown: c })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'share' && dialogTarget && <ShareDialog countdown={dialogTarget} now={now} onClose={() => setDialog(null)} />}
      {dialog?.type === 'settings' && (
        <SettingsDialog
          settings={settings}
          onChange={(patch) => dispatch({ type: 'settings', patch })}
          onTestSound={() => void playBeep(settings.volume)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'help' && <ShortcutsDialog onClose={() => setDialog(null)} />}

      <Toast toast={toast} onDone={clearToast} />
      <div className="sr-only" aria-live="assertive">
        {announcement}
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" className="logo-mark size-11 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" strokeWidth="4" className="ring-track" />
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="119.4"
        strokeDashoffset="35"
        transform="rotate(-90 24 24)"
        className="ring-bar"
      />
      <path d="M24 13v11l7 4" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="logo-hands" />
    </svg>
  );
}
