import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { wakeLockSupported } from '../hooks/useWakeLock';
import { notificationSupport, requestNotifications, type NotifySupport } from '../lib/alarm';
import type { Settings } from '../lib/storage';
import { Dialog } from './Dialog';
import { ThemePicker } from './ThemePicker';
import { Button, Switch } from './ui';

const NOTIFY_HINT: Record<NotifySupport, string> = {
  granted: 'When a countdown ends while you are in another tab or app.',
  default: 'When a countdown ends while you are in another tab or app. The browser asks first.',
  denied: 'Blocked in this browser’s site settings. Allow notifications there to use this.',
  unsupported: 'This browser cannot show notifications from a web page.',
};

const sectionTitle = 'text-xs font-bold tracking-[0.2em] text-muted uppercase';

export function SettingsDialog({
  settings,
  onChange,
  onTestSound,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onTestSound: () => void;
  onClose: () => void;
}) {
  const [support, setSupport] = useState(notificationSupport);
  const canWake = wakeLockSupported();

  const toggleNotify = async (on: boolean) => {
    if (!on) {
      onChange({ notify: false });
      return;
    }
    const answer = support === 'granted' ? 'granted' : await requestNotifications();
    setSupport(answer);
    onChange({ notify: answer === 'granted' });
  };

  return (
    <Dialog title="Settings" onClose={onClose}>
      <div className="space-y-7">
        <section className="space-y-3">
          <h3 className={sectionTitle}>Theme</h3>
          <ThemePicker value={settings.theme} onChange={(theme) => onChange({ theme })} />
        </section>

        <section className="space-y-4">
          <h3 className={sectionTitle}>When time is up</h3>
          <Switch
            label="Beep"
            hint="The original beep-beep. Browsers play sound only after you have clicked the page once."
            checked={!settings.muted}
            onChange={(on) => onChange({ muted: !on })}
          />
          <div className="flex items-center gap-3">
            {settings.muted ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-muted" />}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              disabled={settings.muted}
              onChange={(e) => onChange({ volume: Number(e.target.value) })}
              aria-label="Volume"
              className="min-w-0 flex-1 accent-[var(--cs-accent)] disabled:opacity-40"
            />
            <span className="w-10 text-right text-sm text-muted tabular-nums">{Math.round(settings.volume * 100)}%</span>
            <Button variant="outline" onClick={onTestSound} disabled={settings.muted}>
              Test
            </Button>
          </div>
          <Switch
            label="Browser notification"
            hint={NOTIFY_HINT[support]}
            checked={settings.notify && support === 'granted'}
            disabled={support === 'unsupported' || support === 'denied'}
            onChange={toggleNotify}
          />
        </section>

        <section className="space-y-4">
          <h3 className={sectionTitle}>Screen</h3>
          <Switch
            label="Keep the screen on"
            hint={
              canWake
                ? 'While a timer runs or stage mode is open.'
                : 'This browser cannot keep the screen on (it needs https and a recent browser).'
            }
            checked={settings.keepAwake && canWake}
            disabled={!canWake}
            onChange={(keepAwake) => onChange({ keepAwake })}
          />
        </section>
      </div>
    </Dialog>
  );
}
