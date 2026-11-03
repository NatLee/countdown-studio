import { Check, Copy, Send } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { Countdown } from '../lib/countdown';
import { shareUrl } from '../lib/share';
import { Dialog } from './Dialog';
import { Button } from './ui';

export function ShareDialog({ countdown, now, onClose }: { countdown: Countdown; now: number; onClose: () => void }) {
  // Fixed when the dialog opens, so the link does not change while you copy it.
  const [url] = useState(() => shareUrl(countdown, now, window.location));
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const running = countdown.kind === 'timer' && countdown.state.status === 'running';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access (plain http, old browser): select the text so Ctrl+C works.
      input.current?.select();
    }
  };

  const explanation =
    countdown.kind === 'event'
      ? 'Anyone with this link sees the same moment, shown in their own time zone too.'
      : running
        ? 'This timer is running, so the link carries its end time: everyone sees the same countdown.'
        : 'The link carries the length of the timer; whoever opens it starts their own.';

  return (
    <Dialog title={`Share “${countdown.label}”`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{explanation} Opening it adds the countdown to their list.</p>
        <label htmlFor={inputId} className="sr-only">
          Share link
        </label>
        <input
          id={inputId}
          ref={input}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 font-mono text-sm text-ink"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={copy} data-autofocus>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          {typeof navigator.share === 'function' && (
            <Button variant="outline" onClick={() => navigator.share({ title: countdown.label, url }).catch(() => undefined)}>
              <Send size={16} /> Share…
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
