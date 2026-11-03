import { THEMES, type ThemeId } from '../lib/themes';

/**
 * Theme swatches. Each swatch carries its own data-theme, so it is drawn with that theme's real
 * colours and digit font from index.css – there is no second colour list to keep in sync.
 */
export function ThemePicker({
  value,
  onChange,
  compact = false,
}: {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Theme" className={`flex ${compact ? 'gap-1.5' : 'flex-wrap gap-2'}`}>
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          role="radio"
          aria-checked={value === theme.id}
          aria-label={`${theme.name} theme`}
          title={`${theme.name} theme`}
          data-theme={theme.id}
          onClick={() => onChange(theme.id)}
          className={`swatch ${compact ? 'swatch-compact' : ''}`}
        >
          <span className="swatch-digits">12</span>
          {!compact && <span className="swatch-name">{theme.name}</span>}
        </button>
      ))}
    </div>
  );
}
