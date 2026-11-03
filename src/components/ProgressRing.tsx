import type { ReactNode } from 'react';

/**
 * A ring that fills clockwise as time goes by. `size` and `stroke` are in SVG units; the ring
 * scales to whatever box CSS gives it.
 */
export function ProgressRing({
  progress,
  size = 64,
  stroke = 4,
  className = '',
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className={`relative grid place-items-center ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - p)}
          className="ring-bar"
        />
      </svg>
      {children}
    </div>
  );
}
