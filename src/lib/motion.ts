/**
 * Less motion: whether the app should stay still, and remembering the member's choice (bundle
 * MOTION-1; Robert, 13 Nov 2026).
 *
 * Two things can ask for less motion, and either one is enough:
 * - the device (the operating system's "reduce motion" setting; WCAG 2.2, 2.3.3);
 * - the member, with the "Less motion" switch in Settings › Appearance, for people who don't know
 *   the device setting or can't change it (a school or shared computer).
 * The switch can only add stillness: it never brings motion back on a device that asked for none.
 *
 * Who calls it: src/features/theme/ (the appearance store, useAccountAppearance and the Settings
 * section) and any code that moves something by itself (the featured band, smooth scrolling).
 * public/theme-init.js repeats readLessMotionChoice and applyLessMotion before the page draws;
 * keep LESS_MOTION_STORAGE_KEY and the attribute the same in both files.
 * What it changes: the data-motion attribute on <html>, which src/styles/index.css reads to switch
 * every animation and transition off.
 */

/** The localStorage key; public/theme-init.js uses the same one. */
export const LESS_MOTION_STORAGE_KEY = 'less-motion';

/** The media query that is true when the device asks for reduced motion. */
export const DEVICE_LESS_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reads whether the member turned "Less motion" on, as this device remembers it.
 *
 * @returns true when the switch was left on; false when it is off, was never used, or storage is
 *   blocked (a private window)
 */
export function readLessMotionChoice(): boolean {
  try {
    return window.localStorage.getItem(LESS_MOTION_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * Remembers the switch on this device.
 *
 * @param isOn - whether "Less motion" is on
 * @returns true when it was saved; false when storage is unavailable (the choice then lasts until
 *   the page closes; for a signed-in member it is on the account anyway)
 */
export function saveLessMotionChoice(isOn: boolean): boolean {
  try {
    window.localStorage.setItem(LESS_MOTION_STORAGE_KEY, isOn ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

/**
 * Says whether the device itself asks for reduced motion.
 *
 * @returns true when it does; false when it doesn't or the browser can't say
 */
export function deviceAsksForLessMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DEVICE_LESS_MOTION_QUERY).matches;
}

/**
 * Shows the member's switch on the page by setting (or removing) data-motion="less" on <html>.
 *
 * @param isOn - whether "Less motion" is on
 */
export function applyLessMotion(isOn: boolean): void {
  if (isOn) {
    document.documentElement.dataset.motion = 'less';
    return;
  }
  delete document.documentElement.dataset.motion;
}

/**
 * Says whether anything that moves by itself should stay still right now. Code that scrolls
 * smoothly or turns a carousel asks this, because CSS alone can't stop those.
 *
 * @returns true when the member's switch is on or the device asks for reduced motion
 */
export function wantsLessMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'less') {
    return true;
  }
  return deviceAsksForLessMotion();
}
