import type { CSSProperties } from 'react';

/**
 * Sparks flying out from the clock when a countdown ends. Pure CSS animation that plays once;
 * hidden entirely for people who ask their system for reduced motion.
 * Positions come from the golden angle so they look scattered without Math.random in render.
 */
const SPARKS = Array.from({ length: 36 }, (_, i) => ({
  angle: (i * 137.508) % 360,
  distance: 12 + ((i * 37) % 30),
  delay: (i % 6) * 60,
  size: 6 + (i % 4) * 3,
  tone: i % 3,
}));

export function FinishBurst() {
  return (
    <div className="burst" aria-hidden="true">
      <span className="burst-ring" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className={`burst-spark tone-${s.tone}`}
          style={
            {
              '--a': `${s.angle}deg`,
              '--d': s.distance,
              '--s': `${s.size}px`,
              '--delay': `${s.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
