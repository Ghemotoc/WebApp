/**
 * scrubErrorText: removes anything personal or secret from an error's text before it leaves the
 * browser (story S1-E1-05; GDPR art. 5(1)(c), data minimisation in logs).
 *
 * Who calls it: lib/buildErrorReport.ts, for the error's name and message.
 * What it calls: nothing. The database scrubs again with the same rules
 * (public.scrub_error_text, supabase/migrations/20261018100001_s1_e1_05_client_errors.sql),
 * because anyone can send a report directly; keep the two lists in step.
 * Why quoted text goes: error messages often quote what someone typed ("Invalid value 'my poem'"),
 * and user text must never reach the log (story S1-E1-05, acceptance criteria).
 */

/** One rule: what to look for and what to put in its place. */
interface ScrubRule {
  pattern: RegExp;
  replacement: string;
}

/**
 * The rules, in the order they run. Web addresses go first so the emails and codes inside them
 * are removed in one piece.
 */
const scrubRules: ScrubRule[] = [
  // Web addresses, which can carry codes in their query string.
  { pattern: /https?:\/\/\S+/gi, replacement: '[url]' },
  // Email addresses.
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[email]' },
  // Signed tokens (JWTs start with "eyJ").
  { pattern: /eyJ[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+){0,2}/g, replacement: '[token]' },
  // IDs (UUIDs).
  {
    pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    replacement: '[id]',
  },
  // Quoted text. A single quote only opens a quote after a space, a bracket or the start, so the
  // apostrophe in "can't" stays.
  {
    pattern: /(^|[\s([{:=,])("[^"]*"|'[^']*'|“[^”]*”|„[^”“]*[”“])/g,
    replacement: '$1[text]',
  },
  // Long unbroken strings of letters, digits, _ and - (API keys, codes, hashes).
  { pattern: /[A-Za-z0-9_-]{24,}/g, replacement: '[token]' },
  // Long runs of digits (phone numbers, account numbers, timestamps).
  { pattern: /[0-9]{6,}/g, replacement: '[number]' },
];

/**
 * Scrubs and trims a piece of error text.
 *
 * @param rawText - the error's name or message, as the browser gave it
 * @param maximumLength - how many characters to keep (100 for names, 500 for messages)
 * @returns the text with placeholders such as [email] and [text], at most maximumLength long
 */
export function scrubErrorText(rawText: string, maximumLength: number): string {
  let scrubbedText = rawText;
  // Step 1: run every rule over the text, one after another.
  for (const rule of scrubRules) {
    scrubbedText = scrubbedText.replace(rule.pattern, rule.replacement);
  }
  // Step 2: keep it within the database's limit.
  return scrubbedText.slice(0, maximumLength);
}
