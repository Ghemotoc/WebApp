/**
 * The settings staff changed on a story, and whether a reason is complete (bundle ADMIN-2, part
 * b1; story S1-E11-08, part 08a).
 *
 * Who calls it: StaffStorySettingsForm, StaffStoryVisibilityForm and StaffStoryChapters. Pure
 * functions, so they are tested on their own (staffStorySettingsDiff.test.ts).
 */
import type { StaffStorySettings } from '../api/staffStories';
import {
  storyChangeReasons,
  type StaffStorySettingsChange,
  type StoryChangeReason,
} from '../api/staffStoryChanges';

/** A reason while staff fill it in: the code is empty until one is picked. */
export interface ReasonDraft {
  code: string;
  text: string;
}

/** An empty reason. */
export const emptyReason: ReasonDraft = { code: '', text: '' };

/** The longest reason the database accepts. */
export const reasonMaxLength = 1000;

/**
 * Turns tags typed as "mystery, family" into a clean list: trimmed, no empty names, no repeats.
 *
 * @param typed - the tags as staff typed them
 * @returns the names
 */
export function tagNamesFrom(typed: string): string[] {
  const names: string[] = [];
  for (const part of typed.split(',')) {
    const name = part.trim();
    if (name !== '' && !names.includes(name)) names.push(name);
  }
  return names;
}

/** The settings compared one by one; tags are compared on their own, as sorted lists. */
const plainFields = [
  'rating',
  'completionStatus',
  'commentsEnabled',
  'categorySlug',
  'languageCode',
  'isFanFiction',
  'isParody',
  'dealsWithAbuseOrCoercion',
] as const;

/**
 * True when two lists of names differ; a new order alone isn't a change (tags, rating reasons).
 *
 * @returns whether the list changed
 */
function listsDiffer(saved: string[], wanted: string[]): boolean {
  return [...saved].sort().join('\n') !== [...wanted].sort().join('\n');
}

/**
 * The fields whose value differs from what is saved. A story always has a category, so an empty
 * category in the form is never sent.
 *
 * @param saved - the settings as the database holds them
 * @param wanted - the settings in the form
 * @returns only the changed fields (empty when nothing changed)
 */
export function settingsChange(
  saved: StaffStorySettings,
  wanted: StaffStorySettings,
): StaffStorySettingsChange {
  // Step 1: every plain field whose value moved.
  const change: Record<string, unknown> = {};
  for (const field of plainFields) {
    if (wanted[field] !== saved[field] && wanted[field] !== null) change[field] = wanted[field];
  }
  // Step 2: the whole tag list, when the set of tags changed.
  if (listsDiffer(saved.tagNames, wanted.tagNames)) change['tagNames'] = wanted.tagNames;
  // Step 3: the rating reasons, the same way (SPONSORS-f). The database empties them below 16+.
  if (listsDiffer(saved.ratingReasons, wanted.ratingReasons)) {
    change['ratingReasons'] = wanted.ratingReasons;
  }
  return change as StaffStorySettingsChange;
}

/**
 * The reason to send, or null while it is incomplete (a code from the list and some words).
 *
 * @param draft - the reason in the form
 * @returns the reason, or null
 */
export function completeReason(draft: ReasonDraft): StoryChangeReason | null {
  const code = storyChangeReasons.find((known) => known === draft.code);
  const text = draft.text.trim();
  if (code === undefined || text === '' || text.length > reasonMaxLength) return null;
  return { code, text };
}
