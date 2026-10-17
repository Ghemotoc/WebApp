/**
 * The quick username and pen name rules the forms check while someone types (story S1-E2-04).
 *
 * Why here as well as in the database: the length, space and invisible-character rules need no
 * lists, so the form answers them at once without asking the server. The database is still the
 * judge: check_handle(), check_pen_name() and the set_my_* functions apply every rule again,
 * including the word lists, look-alikes and "taken" (supabase/migrations/…_s1_e2_04_handles.sql).
 * Keep the two in step: the same limits (3 to 30, 50) and the same invisible characters.
 * Who calls it: hooks/useHandleCheck.ts and the name fields; displayName() is used wherever a
 * person's name is shown.
 */

/** Every refusal the database can give for a username, plus 'ok'. */
export type HandleOutcome =
  | 'ok'
  | 'too_short'
  | 'too_long'
  | 'invisible_characters'
  | 'spaces'
  | 'looks_like_staff'
  | 'reserved'
  | 'not_allowed'
  | 'taken'
  | 'too_soon';

/** Every refusal the database can give for a pen name, plus 'ok'. */
export type PenNameOutcome =
  'ok' | 'too_long' | 'invisible_characters' | 'looks_like_staff' | 'not_allowed' | 'too_soon';

/** The outcomes the database may send back, so an unexpected answer is caught, not shown raw. */
const knownHandleOutcomes: readonly string[] = [
  'ok',
  'too_short',
  'too_long',
  'invisible_characters',
  'spaces',
  'looks_like_staff',
  'reserved',
  'not_allowed',
  'taken',
  'too_soon',
];

/** Username length in characters (S1-E2-04; board 2.5: "3 to 30 characters"). */
export const handleLength = { minimum: 3, maximum: 30 };

/** The longest pen name, in characters (profiles_pen_name_length). */
export const penNameMaximumLength = 50;

/**
 * Characters used to fake names: control characters, zero-width characters, direction overrides,
 * tag characters and invisible fillers. The same list as has_invisible_characters() in the database.
 */
const invisibleCharacters =
  // eslint-disable-next-line no-control-regex, no-misleading-character-class -- these characters are exactly what this pattern looks for
  /[\u0001-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFE00-\uFE0E\uFEFF\uFFA0\uFFF0-\uFFFB\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/u;

/** A joiner or emoji variation selector next to a letter, digit or space, or at an edge. */
const misplacedJoiner =
  /(^|[\p{L}\p{N}\s])\u200D|\u200D($|[\p{L}\p{N}\s])|(^|[\p{L}\p{N}\s])\uFE0F/u;

/** Any kind of space, including the wide and no-break ones. */
const anySpace = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/u;

/**
 * Counts characters the way the database does (Unicode code points), so "👩" counts as one.
 *
 * @param text - any text
 * @returns the number of code points
 */
export function countCharacters(text: string): number {
  return [...text].length;
}

/**
 * Says whether a name holds a character used to fake names.
 *
 * @param text - the name as typed
 * @returns true when it holds one
 */
export function hasInvisibleCharacters(text: string): boolean {
  return invisibleCharacters.test(text) || misplacedJoiner.test(text);
}

/**
 * The refusals the form can give before asking the database.
 *
 * @param candidate - the username as typed
 * @returns a refusal, or null when only the database can decide
 */
export function quickHandleProblem(candidate: string): HandleOutcome | null {
  const length = countCharacters(candidate);
  if (length < handleLength.minimum) return 'too_short';
  if (length > handleLength.maximum) return 'too_long';
  if (hasInvisibleCharacters(candidate)) return 'invisible_characters';
  if (anySpace.test(candidate)) return 'spaces';
  return null;
}

/**
 * The refusals the form can give for a pen name before asking the database.
 *
 * @param candidate - the pen name as typed; empty means "no pen name"
 * @returns a refusal, or null when only the database can decide
 */
export function quickPenNameProblem(candidate: string): PenNameOutcome | null {
  if (countCharacters(candidate.trim()) > penNameMaximumLength) return 'too_long';
  if (hasInvisibleCharacters(candidate)) return 'invisible_characters';
  return null;
}

/**
 * Turns the database's answer into a known outcome.
 *
 * @param answer - what check_handle() or set_my_handle() returned
 * @returns the outcome
 * Errors: throws for an answer this app doesn't know, so it is reported instead of shown raw.
 */
export function toHandleOutcome(answer: unknown): HandleOutcome {
  if (typeof answer === 'string' && knownHandleOutcomes.includes(answer)) {
    return answer as HandleOutcome;
  }
  throw new Error(`Unexpected answer from the username check: ${String(answer)}`);
}

/**
 * The name shown on a person's content (S1-E2-04): the pen name when there is one, else the
 * username. The database's display_name() gives the same answer for public views.
 *
 * @param handle - the username, or null before setup
 * @param penName - the pen name, or null
 * @returns the name to show, or null when the person has neither yet
 */
export function displayName(handle: string | null, penName: string | null): string | null {
  const trimmedPenName = penName?.trim() ?? '';
  return trimmedPenName === '' ? handle : trimmedPenName;
}

/**
 * When a name may change again (S1-E2-04: once every 30 days; the first choice doesn't count).
 *
 * @param lastChangedAt - when it last changed (ISO text), or null when it never has since setup
 * @param waitingDays - the days between changes, from settings
 * @param now - the current time (passed in so tests are exact)
 * @returns the date it may change again, or null when it may change now
 */
export function nextChangeDate(
  lastChangedAt: string | null,
  waitingDays: number,
  now: Date,
): Date | null {
  if (lastChangedAt === null) return null;
  const allowedFrom = new Date(new Date(lastChangedAt).getTime() + waitingDays * 86_400_000);
  return allowedFrom > now ? allowedFrom : null;
}
