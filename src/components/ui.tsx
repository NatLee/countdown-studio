/** Small building blocks shared by the screens. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const join = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

/** A square button with an icon; `label` becomes the accessible name and the tooltip. */
export function IconButton({ label, className, children, ...rest }: ButtonProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={join(
        'inline-grid size-9 shrink-0 place-items-center rounded-xl text-muted transition',
        'hover:bg-raised hover:text-ink focus-visible:text-ink disabled:pointer-events-none disabled:opacity-35',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Button({
  variant = 'quiet',
  className,
  children,
  ...rest
}: ButtonProps & { variant?: 'primary' | 'quiet' | 'outline' }) {
  return (
    <button
      type="button"
      className={join(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
        'disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-on-accent shadow-[0_0_24px_-6px_var(--cs-accent)] hover:brightness-110',
        variant === 'quiet' && 'text-ink hover:bg-raised',
        variant === 'outline' && 'border border-line text-ink hover:border-muted/60 hover:bg-raised',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** An on/off switch with a visible label and an optional hint under it. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-sm text-muted">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={join(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-40',
          checked ? 'border-accent bg-accent' : 'border-line bg-raised',
        )}
      >
        <span
          className={join(
            'absolute top-0.5 size-4.5 rounded-full transition-all',
            checked ? 'left-[1.4rem] bg-on-accent' : 'left-0.5 bg-muted',
          )}
        />
      </button>
    </div>
  );
}

/** Keyboard key cap, for the shortcut table and hints. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-7 place-items-center rounded-md border border-line border-b-2 bg-raised px-1.5 py-0.5 font-ui text-xs font-semibold text-ink">
      {children}
    </kbd>
  );
}
