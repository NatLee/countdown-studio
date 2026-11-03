/**
 * Keyboard shortcuts. The help dialog and the key handler both read this list, so they cannot
 * disagree. `keys` are KeyboardEvent.key values (letters in lower case).
 */
export type ShortcutAction =
  | 'toggle'
  | 'reset'
  | 'add'
  | 'subtract'
  | 'stage'
  | 'prev'
  | 'next'
  | 'new'
  | 'edit'
  | 'share'
  | 'theme'
  | 'mute'
  | 'help';

export interface Shortcut {
  action: ShortcutAction;
  keys: string[];
  /** How the keys are written in the help table. */
  label: string[];
  description: string;
}

export const SHORTCUTS: Shortcut[] = [
  { action: 'toggle', keys: [' '], label: ['Space'], description: 'Start or pause the selected timer' },
  { action: 'reset', keys: ['r'], label: ['R'], description: 'Reset the selected timer' },
  { action: 'add', keys: ['+', '='], label: ['+'], description: 'Add a minute to the selected timer' },
  { action: 'subtract', keys: ['-', '_'], label: ['−'], description: 'Take a minute off the selected timer' },
  { action: 'stage', keys: ['f'], label: ['F'], description: 'Stage mode: the selected countdown, full screen' },
  { action: 'prev', keys: ['arrowleft'], label: ['←'], description: 'Select the previous countdown' },
  { action: 'next', keys: ['arrowright'], label: ['→'], description: 'Select the next countdown' },
  { action: 'new', keys: ['n'], label: ['N'], description: 'New countdown' },
  { action: 'edit', keys: ['e'], label: ['E'], description: 'Edit the selected countdown' },
  { action: 'share', keys: ['s'], label: ['S'], description: 'Share the selected countdown' },
  { action: 'theme', keys: ['t'], label: ['T'], description: 'Next theme' },
  { action: 'mute', keys: ['m'], label: ['M'], description: 'Sound on / off' },
  { action: 'help', keys: ['?'], label: ['?'], description: 'Show these shortcuts' },
];

/** Esc is handled by the dialogs and by stage mode themselves; listed here for the help table. */
export const ESCAPE_HELP = { label: ['Esc'], description: 'Leave stage mode or close a dialog' };

const byKey = new Map(SHORTCUTS.flatMap((s) => s.keys.map((k) => [k, s.action] as const)));

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const PRESSABLE = 'button, a[href], summary, [role="button"], [role="switch"], [role="tab"]';

/**
 * The shortcut a key press means, or null. Presses with Ctrl/Alt/Cmd, presses while typing in a
 * field, and Space/Enter on a focused button (which already presses that button) are not shortcuts.
 */
export function shortcutFor(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'>): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(TYPING)) return null;
  if ((event.key === ' ' || event.key === 'Enter') && target?.closest(PRESSABLE)) return null;
  return byKey.get(event.key.toLowerCase()) ?? null;
}
