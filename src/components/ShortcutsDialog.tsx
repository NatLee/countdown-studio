import { ESCAPE_HELP, SHORTCUTS } from '../lib/shortcuts';
import { Dialog } from './Dialog';
import { Kbd } from './ui';

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows = [...SHORTCUTS, ESCAPE_HELP];
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.description} className="border-b border-line/60 last:border-0">
              <td className="w-20 py-2 pr-4">
                <span className="flex gap-1">
                  {row.label.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </td>
              <td className="py-2 text-muted">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
