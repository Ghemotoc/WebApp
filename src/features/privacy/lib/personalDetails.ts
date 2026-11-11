/**
 * personalDetails: does a text look like it shares where to find someone? (bundle MUST-1, part b;
 * IDEA-20261108-6, "A heads-up before sharing personal details").
 *
 * The comment, forum post, message and bio boxes ask "Post anyway?" when this finds something
 * shaped like a phone number, an email address, a street address or a school's name. It runs only
 * in the person's own browser and never blocks, stores or reports anything, so it is a seatbelt,
 * not text moderation (CLAUDE.md rule 19). It errs on the side of asking: a false alarm costs one
 * press of "Post anyway"; a miss costs nothing more than today.
 * Who calls it: usePersonalDetailsCheck. What it calls: nothing (pure, unit-tested).
 */

/** What kind of detail was found, so the note could say which (and the tests can check). */
export type PersonalDetailKind = 'email' | 'phone' | 'address' | 'school';

/** An email address: something@something.tld. */
const emailPattern = /[\p{L}0-9._%+-]+@[\p{L}0-9-]+(?:\.[\p{L}0-9-]+)*\.\p{L}{2,}/u;

/** A run that could be a phone number: digits with spaces, dots, dashes or brackets between. */
const phoneCandidatePattern = /[+(]?\d[\d\s.\-()]{6,}\d/g;

/** 555-123-4567 or 555 123 4567: the North American shape, which starts with neither + nor 0. */
const groupedPhonePattern = /\d{3}[\s.-]\d{3}[\s.-]\d{4}/;

/**
 * Street addresses. Romanian: a street word (Strada, Str., Bd., Calea, Aleea, Șoseaua, Piața)
 * followed by a name and a number. English: a number, up to two capitalised words and a street word
 * (Road, Street, Avenue and the like). Nordic: a name ending in -gatan, -vägen, -vej, -veien or -gate, then a number.
 */
const addressPatterns = [
  /(?:^|[^\p{L}])(?:strada|str\.|bd\.|bulevardul|calea|aleea|[șş]oseaua|soseaua|pia[țţ]a|piata)\s+[\p{L}][\p{L}.' -]{1,40}?\s*(?:nr\.?|num[ăa]rul)?\s*\d+/iu,
  /\b\d{1,5}\s+(?:[A-Z][\p{L}'-]+\s+){0,2}(?:[Ss]treet|St|[Rr]oad|Rd|[Aa]venue|Ave|[Ll]ane|Ln|[Dd]rive|Dr|[Ww]ay|[Cc]lose|[Cc]ourt|[Cc]rescent|[Bb]oulevard|Blvd|[Pp]lace|[Tt]errace)\b/u,
  /\p{L}+(?:gatan|gata|v[äa]gen|vej|veien|veg|gate)\s+\d+/iu,
];

/**
 * School names. Romanian: Școala, Liceul or Colegiul followed by a name or number. English: one or
 * more capitalised words before High School, Primary School, Academy and the like. Nordic: a name
 * ending in -skolan, -skola, -skole, -skolen or -gymnasiet.
 */
const schoolPatterns = [
  /(?:^|[^\p{L}])(?:[șş]coala|scoala|liceul|colegiul)\s+(?:gimnazial[ăa]\s+|na[țţ]ional\s+|tehnic\s+|teoretic\s+)?(?:nr\.?\s*\d+|["„“]?\p{Lu})/iu,
  /\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+)*\s+(?:High School|Primary School|Secondary School|Grammar School|Middle School|Elementary School|Academy|College)\b/u,
  /\p{L}+(?:skolan|skola|skole|skolen|gymnasiet)\b/iu,
];

/**
 * Whether one candidate run looks like a phone number: 9 to 15 digits, starting with +, 0 or a
 * bracket, or in the 3-3-4 shape. Years and page numbers written one after another don't match.
 *
 * @param candidate - a run from phoneCandidatePattern
 * @returns true when it looks like a phone number
 */
function isPhoneShaped(candidate: string): boolean {
  const digitCount = candidate.replace(/\D/g, '').length;
  if (digitCount < 9 || digitCount > 15) return false;
  const trimmed = candidate.trim();
  if (/^[+(0]/.test(trimmed)) return true;
  return groupedPhonePattern.test(trimmed);
}

/**
 * Whether the text has something shaped like a phone number.
 *
 * @param text - the words as typed
 * @returns true when one run looks like a phone number
 */
function hasPhoneNumber(text: string): boolean {
  const candidates = text.match(phoneCandidatePattern) ?? [];
  return candidates.some(isPhoneShaped);
}

/**
 * Finds the kinds of personal detail a text seems to hold.
 *
 * @param text - the words as typed
 * @returns the kinds found, in a fixed order; empty when nothing looks personal
 */
export function findPersonalDetails(text: string): PersonalDetailKind[] {
  const found: PersonalDetailKind[] = [];
  // Step 1: each kind is looked for on its own, so one match never hides another.
  if (emailPattern.test(text)) found.push('email');
  if (hasPhoneNumber(text)) found.push('phone');
  if (addressPatterns.some((pattern) => pattern.test(text))) found.push('address');
  if (schoolPatterns.some((pattern) => pattern.test(text))) found.push('school');
  return found;
}
