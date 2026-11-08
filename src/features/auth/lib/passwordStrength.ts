/**
 * passwordStrength: how strong a new password looks, for the four-segment meter under the
 * password field (bundle G3 COMPONENTS; handoff "Fields and forms": four segments, red (weak),
 * yellow (fair), green (strong), dark green (very strong), with the word underneath).
 *
 * The meter is a hint, never a rule: the only rules are the ones sign-up already checks (at least
 * 10 characters, not on a list of leaked passwords; canvas 2.1). Length counts most, because a
 * long passphrase is the advice we give ("You can paste it from a password manager"); mixing
 * kinds of characters adds a little. Builder's scale (no outside library, nothing sent anywhere):
 *   under 10 characters, or one character repeated  weak
 *   10 to 13                                         fair
 *   14 to 19                                         strong
 *   20 or more                                       very strong
 *   three or more kinds (lower, upper, digits, symbols, spaces) move it one step up, to at most
 *   very strong, once it has 10 characters.
 * Who calls it: PasswordStrengthMeter. What it calls: nothing.
 */

/** The four steps, weakest first. */
export const passwordStrengths = ['weak', 'fair', 'strong', 'very-strong'] as const;

/** One step of the meter. */
export type PasswordStrength = (typeof passwordStrengths)[number];

/** The kinds of characters that count as variety. */
const characterKinds = [/[a-zăâîșț]/u, /[A-ZĂÂÎȘȚ]/u, /\d/, /[^\p{L}\d\s]/u, /\s/];

/**
 * How many kinds of characters a password mixes.
 *
 * @param password - the typed password
 * @returns 0 to 5
 */
function kindsIn(password: string): number {
  return characterKinds.filter((kind) => kind.test(password)).length;
}

/**
 * Rates a password for the meter.
 *
 * @param password - the typed password
 * @returns the step, or null for an empty field (the meter then stays empty)
 */
export function passwordStrength(password: string): PasswordStrength | null {
  // Step 1: nothing typed yet, nothing to show.
  if (password === '') return null;
  // Step 2: too short, or one character over and over, is weak whatever else it has.
  const length = [...password].length;
  if (length < 10 || new Set(password).size === 1) return 'weak';
  // Step 3: length sets the step; variety adds one.
  let step = 1;
  if (length >= 14) step = 2;
  if (length >= 20) step = 3;
  if (kindsIn(password) >= 3) step += 1;
  return passwordStrengths[Math.min(step, 3)] ?? 'very-strong';
}
