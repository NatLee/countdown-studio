import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './ui';

/**
 * A modal built on the native <dialog>: the browser traps focus, closes it on Esc and puts it
 * above everything (even stage mode in full screen). Clicking the dimmed backdrop closes it too.
 * Mark the control that should get focus first with data-autofocus.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  className = '',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // showModal focuses the first button (Close); start where the user wants to type or act.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close();
      }}
      className={`dialog m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <h2 id={titleId} className="flex-1 text-lg font-semibold">
          {title}
        </h2>
        <IconButton label="Close" onClick={() => ref.current?.close()}>
          <X size={18} />
        </IconButton>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}
