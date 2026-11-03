/** The big digits. Sizes come from CSS (`.clock-*` in index.css) so they always fit their box. */
import { Fragment, useState, type CSSProperties } from 'react';
import { clockGroups, describeSeconds, formatClock } from '../lib/time';

/** card: a card in the grid · feature: the only card, full width · stage: full screen */
export type ClockVariant = 'card' | 'feature' | 'stage';

export function ClockFace({ seconds, variant, flip }: { seconds: number; variant: ClockVariant; flip: boolean }) {
  const groups = clockGroups(seconds);
  const cells = groups.reduce((n, g) => n + g.digits.length, 0);
  const style = { '--cells': cells, '--seps': groups.length - 1 } as CSSProperties;
  return (
    <div role="timer" aria-label={`${describeSeconds(seconds)} left`} className={`clock clock-${variant}`} style={style}>
      {groups.map((group, i) => (
        <Fragment key={group.unit}>
          {i > 0 && <ClockSeparator />}
          <span className="clock-group" aria-hidden="true">
            <span className="clock-digits">
              {[...group.digits].map((digit, j) =>
                // Keyed from the right, so the ones digit keeps its key when a day count grows a digit.
                flip ? (
                  <FlipDigit key={group.digits.length - j} value={digit} />
                ) : (
                  <span key={group.digits.length - j} className="clock-digit">
                    {digit}
                  </span>
                ),
              )}
            </span>
            <span className="clock-unit">{group.unit}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** A time of day such as "07:03:30", drawn with the theme's digits (the header's local clock). */
export function WallClock({ time, label }: { time: string; label: string }) {
  const groups = time.split(':');
  return (
    <span className="clock clock-inline" role="timer" aria-label={label}>
      {groups.map((digits, i) => (
        <Fragment key={i}>
          {i > 0 && <ClockSeparator />}
          <span className="clock-digits" aria-hidden="true">
            {[...digits].map((d, j) => (
              <span key={j} className="clock-digit">
                {d}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * The colon between groups, drawn as two dots instead of a font glyph: colons differ wildly
 * between fonts (Doto's is as wide as a digit), dots look the same in every theme.
 */
export function ClockSeparator() {
  return (
    <span className="clock-sep" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

/**
 * A split-flap card. When the value changes, the old top half folds down and the new bottom half
 * lands on top of the old one. With reduced motion the flaps are hidden and the digit just changes.
 */
function FlipDigit({ value }: { value: string }) {
  const [flap, setFlap] = useState({ current: value, previous: value, turn: 0 });
  if (flap.current !== value) {
    setFlap({ current: value, previous: flap.current, turn: flap.turn + 1 });
  }
  const { current, previous, turn } = flap;
  return (
    <span className="clock-digit flip-digit">
      <span className="flip-half flip-top">
        <span>{current}</span>
      </span>
      <span className="flip-half flip-bottom">
        <span>{current}</span>
      </span>
      {turn > 0 && previous !== current && (
        <Fragment key={turn}>
          <span className="flip-half flip-bottom flip-flap flip-old-bottom">
            <span>{previous}</span>
          </span>
          <span className="flip-half flip-top flip-flap flip-fold">
            <span>{previous}</span>
          </span>
          <span className="flip-half flip-bottom flip-flap flip-land">
            <span>{current}</span>
          </span>
        </Fragment>
      )}
    </span>
  );
}

/** What replaces the digits once the time is up: the old page's "Time's Up!", plus the overtime. */
export function FinishedFace({ overtime, variant }: { overtime: number; variant: ClockVariant }) {
  return (
    <div className={`finished finished-${variant}`}>
      <div className="finished-title">Time&rsquo;s up!</div>
      <div className="finished-over" aria-label={`${describeSeconds(overtime)} over`}>
        +{formatClock(overtime)}
      </div>
    </div>
  );
}
