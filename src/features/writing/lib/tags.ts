/**
 * Tag rules the form applies as the writer types (story S1-E3-01).
 *
 * The rule (S1-E3-01 acceptance criterion): tags are lower-cased, trimmed and diacritic-normalised,
 * so "Fantezie" and "fantezie" are one tag. The database applies the same rule in
 * normalise_tag() (supabase/migrations/…_s1_e3_01_categories_and_tags.sql) when it saves, so the
 * form's answer and the saved one always agree. At most 10 tags, each at most 40 characters.
 * Who calls it: TagInput (src/features/writing/components/) and the zod schema (src/schemas/story.ts).
 */
import { normaliseRomanianLetters } from '@/lib/romanian-text';

/** A story carries at most this many tags (S1-E3-01). */
export const MAXIMUM_TAGS = 10;

/** A tag has at most this many characters (database constraint tags_name_length). */
export const MAXIMUM_TAG_LENGTH = 40;

/**
 * The one form every look-alike of a tag shares.
 *
 * @param tagName - the tag as typed
 * @returns trimmed, spaces collapsed, ş/ţ corrected, lower case, accents removed
 *   ("  Fantézie " → "fantezie", "set in Romania" → "set in romania")
 */
export function normaliseTag(tagName: string): string {
  // Step 1: tidy the spaces and the Romanian letters.
  const tidy = normaliseRomanianLetters(tagName.trim().replace(/\s+/g, ' '));
  // Step 2: lower case, then split accents off their letters (NFD) and drop them.
  return tidy.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * The tag as it is shown: trimmed, spaces collapsed, Romanian letters corrected, case kept.
 *
 * @param tagName - the tag as typed
 * @returns the display form, for example "Set in Romania"
 */
export function tidyTag(tagName: string): string {
  return normaliseRomanianLetters(tagName.trim().replace(/\s+/g, ' '));
}

/**
 * Adds a tag to a list unless it is empty, too long, a look-alike of one already there, or
 * the list is full.
 *
 * @param tags - the tags so far, as shown
 * @param tagName - the new tag as typed
 * @returns the new list, or the same list when nothing was added
 */
export function addTag(tags: string[], tagName: string): string[] {
  const shown = tidyTag(tagName);
  const normalised = normaliseTag(tagName);
  if (normalised === '' || normalised.length > MAXIMUM_TAG_LENGTH) return tags;
  if (tags.length >= MAXIMUM_TAGS) return tags;
  if (tags.some((existing) => normaliseTag(existing) === normalised)) return tags;
  return [...tags, shown];
}
