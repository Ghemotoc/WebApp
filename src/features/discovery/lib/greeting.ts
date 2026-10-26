/**
 * Which words the Discover greeting line uses (stories S1-E2-12 and S1-E2-13).
 *
 * Who calls it: components/GreetingLine.tsx. What it calls: nothing; the keys are in
 * src/locales/<language>/discovery.json under "greeting".
 */

/**
 * The text key for today's greeting.
 *
 * @param kind - the special greeting, or null
 * @param hour - the reader's hour, 0 to 23
 * @returns a key under "greeting" in discovery.json
 */
export function greetingKeyFor(kind: string | null, hour: number): string {
  if (kind === 'birthday') return 'greeting.birthday';
  if (kind === 'birthday_month') return 'greeting.birthdayMonth';
  if (kind === 'anniversary') return 'greeting.anniversary';
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}
