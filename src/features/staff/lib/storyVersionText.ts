/**
 * What one version in a story's history says (bundle ADMIN-2, part b2; story S1-E11-08, part 08b):
 * "Settings", then one line per changed field, such as "the category: Poetry → Fiction";
 * "Who can find it: shown → hidden"; "Chapter 2: a passage of 14 characters removed".
 *
 * A removed passage's words are never part of a version (support can read the history), so the
 * line only counts its characters. Values are written in the page's language with the same words
 * the forms use.
 * Who calls it: StaffStoryHistory. What it calls: nothing; the words come in as functions.
 */
import type { TFunction } from 'i18next';

import type { Enums, Json } from '@/lib/database.types';

import type { StaffStoryVersion } from '../api/staffStoryHistory';

/** How to write a category, a language and a rating (useStaffStoryWords gives them). */
export interface VersionWords {
  category: (slug: string | null) => string;
  language: (code: string) => string;
  rating: (rating: Enums<'story_rating'>) => string;
}

/** One version as words: a heading and its lines. */
export interface VersionText {
  heading: string;
  lines: string[];
}

/**
 * How each field's text value is written; a field not listed is written as stored.
 *
 * @param t - the staff translation function
 * @param words - how to write categories, languages and ratings
 * @returns one writer per field
 */
function textWriters(t: TFunction, words: VersionWords): Record<string, (text: string) => string> {
  return {
    rating: (text) => words.rating(text as Enums<'story_rating'>),
    category_slug: (text) => words.category(text),
    language_code: (text) => words.language(text),
    visibility: (text) => t(`stories.history.visibility.${text}`, { defaultValue: text }),
    completion_status: (text) => t(`writing:status.${text}`, { defaultValue: text }),
  };
}

/**
 * One stored value in plain words.
 *
 * @param t - the staff translation function
 * @param words - how to write categories, languages and ratings
 * @param field - the field's name
 * @param value - its value
 * @returns the value as words
 */
function valueText(t: TFunction, words: VersionWords, field: string, value: Json | undefined) {
  if (typeof value === 'boolean') return t(value ? 'stories.history.yes' : 'stories.history.no');
  if (Array.isArray(value)) {
    return value.length === 0 ? t('stories.history.noTags') : value.map(String).join(', ');
  }
  const text = typeof value === 'string' ? value : '';
  const writer = textWriters(t, words)[field];
  return writer === undefined ? text : writer(text);
}

/**
 * The lines of a settings or visibility version: one per changed field.
 *
 * @param t - the staff translation function
 * @param words - how to write categories, languages and ratings
 * @param version - the version
 * @returns the lines
 */
function fieldLines(t: TFunction, words: VersionWords, version: StaffStoryVersion): string[] {
  return Object.keys(version.after).map((field) =>
    t('stories.history.change', {
      field: t(`notifications:staffChangeFields.${field}`, { defaultValue: field }),
      before: valueText(t, words, field, version.before[field]),
      after: valueText(t, words, field, version.after[field]),
    }),
  );
}

/**
 * The line of a passage version: removed (with how many characters) or put back.
 *
 * @param t - the staff translation function
 * @param version - the version
 * @returns the line
 */
function passageLine(t: TFunction, version: StaffStoryVersion): string {
  if (version.after['passage'] === 'put_back') return t('stories.history.passagePutBack');
  const before = version.before['passage'];
  const isObject = typeof before === 'object' && before !== null && !Array.isArray(before);
  const characters = isObject ? Number(before['characters'] ?? 0) : 0;
  return t('stories.history.passageRemoved', { count: characters });
}

/**
 * One version in words.
 *
 * @param t - the staff translation function
 * @param words - how to write categories, languages and ratings
 * @param version - the version
 * @returns its heading and lines
 */
export function storyVersionText(
  t: TFunction,
  words: VersionWords,
  version: StaffStoryVersion,
): VersionText {
  const heading = t(`stories.history.kinds.${version.kind}`, {
    number: version.chapterNumber ?? 0,
  });
  if (version.kind === 'passage') return { heading, lines: [passageLine(t, version)] };
  return { heading, lines: fieldLines(t, words, version) };
}

/**
 * Whether Restore can apply to a version: everything except a put-back passage, whose words are
 * already back.
 *
 * @param version - the version
 * @returns true when Restore is offered
 */
export function canRestoreVersion(version: StaffStoryVersion): boolean {
  if (version.kind !== 'passage') return true;
  return version.after['passage'] === 'removed' && version.passageKept;
}
