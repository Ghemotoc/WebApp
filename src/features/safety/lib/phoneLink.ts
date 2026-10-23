/**
 * How a helpline number is shown: a tappable phone link on phones, plain selectable text
 * everywhere else (story S1-E10-13a, acceptance criterion).
 *
 * Who calls it: SafetyContactRow. Pure functions, so they are unit-tested on their own.
 */

/**
 * The address a phone link dials.
 *
 * @param phoneNumber - as the research wrote it, for example "116 111" or "0800 801 200"
 * @returns "tel:" plus the digits (and a leading "+" when there is one)
 */
export function telephoneHref(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

/**
 * Whether this device is one a person taps on (a phone or tablet), where a number should dial.
 *
 * @param matchMedia - the browser's matchMedia, passed in so tests can fake it
 * @returns true for a coarse pointer (touch); false on a desktop or when unknown
 */
export function isTouchDevice(matchMedia: typeof window.matchMedia | undefined): boolean {
  if (matchMedia === undefined) return false;
  return matchMedia('(pointer: coarse)').matches;
}
