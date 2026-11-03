import { useEffect } from 'react';
import { TOAST_MS } from '../config';

export interface ToastData {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

/** One short message at the bottom of the screen, with an optional action such as Undo. */
export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(onDone, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast, onDone]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          className="toast pointer-events-auto flex max-w-xl items-center gap-4 rounded-2xl border border-line bg-raised px-5 py-3 text-sm shadow-2xl"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="shrink-0 font-semibold text-accent hover:underline"
              onClick={() => {
                toast.action?.run();
                onDone();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
