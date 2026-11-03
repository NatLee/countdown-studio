/**
 * The look of the app. Colours and fonts live in CSS (src/index.css, one block per theme);
 * this list only names them and says which ones draw digits as split-flap cards.
 */
export const THEMES = [
  { id: 'neon', name: 'Neon', flip: false },
  { id: 'minimal', name: 'Minimal', flip: false },
  { id: 'flip', name: 'Flip', flip: true },
  { id: 'led', name: 'LED', flip: false },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = 'neon';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function nextTheme(id: ThemeId): ThemeId {
  const i = THEMES.findIndex((t) => t.id === id);
  return THEMES[(i + 1) % THEMES.length].id;
}
