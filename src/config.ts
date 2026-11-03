/** App-wide names and tuning values, kept in one place. */

export const APP_NAME = 'Countdown Studio';

/** Source code link in the footer. */
export const REPO_URL = 'https://github.com/NatLee/countdown-studio';

/** localStorage key for countdowns and settings. Bump STORAGE_VERSION when the shape changes. */
export const STORAGE_KEY = 'countdown-studio';
export const STORAGE_VERSION = 1;

/**
 * How often the screen refreshes while visible. Values are computed from timestamps, so this
 * only decides how soon a new second appears (at most this late), not whether it is right.
 */
export const TICK_MS = 250;

/** Longest label a countdown can have. */
export const LABEL_MAX = 80;

/** How long a toast stays up. */
export const TOAST_MS = 6000;

/** How long stage-mode controls stay visible after the mouse stops moving. */
export const STAGE_IDLE_MS = 2500;

/** Dates and times are written in the same language as the interface, with a 24-hour clock. */
export const DATE_LOCALE = 'en-US';
