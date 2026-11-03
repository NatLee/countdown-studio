import type { CSSProperties } from 'react';

/**
 * Sparks flying out from the clock when a countdown ends. Pure CSS animation that plays once;
 * hidden entirely for people who ask their system for reduced motion.
 * Positions come from the golden angle so they look scattered without Math.random in render.
 */
const SPARKS = Array.from({ length: 28 }, (_, i) => ({
  angle: (i * 137.508) % 360,
  distance: 22 + ((i * 37) % 34),
  delay: (i % 7) * 35,
  size: 4 + (i % 4) * 2,
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
