/**
 * Whether this device is a phone or a tablet, for the computers-only trial (TRIAL-DESKTOP;
 * Robert, 21 Nov 2026: "desktop only at first", told by the device, not the window's width).
 *
 * Who calls it: hooks/useIsTouchFirstDevice.ts.
 * What it calls: the browser's media queries.
 * A touch-first device is one whose main pointer is a finger and which has no mouse or trackpad
 * at all. A laptop with a touch screen has a fine pointer, so it counts as a computer; so does a
 * tablet with a trackpad attached. A narrow window on a computer is still a computer.
 */

/** The media query that is true only on a phone or a tablet with nothing but touch. */
export const touchFirstQuery = '(pointer: coarse) and (not (any-pointer: fine))';

/**
 * Says whether the device is touch first, right now.
 *
 * @returns true on a phone or a touch-only tablet; false on a computer, or where it can't tell
 */
export function isTouchFirstDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(touchFirstQuery).matches;
}
