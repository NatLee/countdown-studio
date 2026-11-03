/** The finish signals: the original beep and an optional browser notification. */
import beepUrl from '../assets/beepbeep.mp3';

let beep: HTMLAudioElement | null = null;

/**
 * Plays the beep at `volume` (0–1). Resolves to false when the browser refuses, which happens
 * until the visitor has clicked or typed on the page once (autoplay rules).
 */
export async function playBeep(volume: number): Promise<boolean> {
  try {
    beep ??= new Audio(beepUrl);
    beep.volume = Math.min(1, Math.max(0, volume));
    beep.currentTime = 0;
    await beep.play();
    return true;
  } catch {
    return false;
  }
}

export type NotifySupport = 'unsupported' | NotificationPermission;

export function notificationSupport(): NotifySupport {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Asks for permission; must be called from a click. */
export async function requestNotifications(): Promise<NotifySupport> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a notification if allowed. Some browsers (Android) only allow them from a service worker. */
export function showNotification(title: string, body: string, icon?: string): void {
  if (notificationSupport() !== 'granted') return;
  try {
    new Notification(title, { body, icon, tag: 'countdown-studio' });
  } catch {
    // Not available on this platform; the beep and the screen still say it.
  }
}
