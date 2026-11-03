import { useEffect, useEffectEvent } from 'react';
import { shortcutFor, type ShortcutAction } from '../lib/shortcuts';

/** Runs `onShortcut` for shortcut keys while `enabled` (off while a dialog is open). */
export function useShortcuts(enabled: boolean, onShortcut: (action: ShortcutAction) => void): void {
  const run = useEffectEvent(onShortcut);
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const action = shortcutFor(event);
      if (!action) return;
      event.preventDefault();
      run(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
