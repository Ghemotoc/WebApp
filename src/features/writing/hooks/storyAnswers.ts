/**
 * The answers a story form keeps while the writer types, shared by the new story form
 * (S1-E3-01) and story settings (S1-E3-05).
 *
 * Who uses it: useNewStoryForm, useStorySettingsForm and every form section in
 * src/features/writing/components/ (they read `answers` and call `set`).
 * Why one type: the sections are the same on both screens (the basics, category and tags, the
 * cover), so they take one shape and don't care which screen they are on.
 */
import type { StoryCoverChoice } from '@/schemas/story';

/** Every answer a story form can hold. */
export interface StoryAnswers {
  /** Made once per new story form, so the automatic cover is known before the story exists (S1-E3-13). */
  storyId: string;
  title: string;
  blurb: string;
  languageCode: string;
  categorySlug: string;
  tags: string[];
  cover: StoryCoverChoice;
  /** Ongoing or Completed (S1-E3-05); a new story starts Ongoing. */
  completionStatus: 'ongoing' | 'completed';
  /** Whether readers may comment (S1-E3-05; enforced by S1-E6-01); on for a new story. */
  commentsEnabled: boolean;
}

/** Changes one answer. */
export type SetStoryAnswer = <Field extends keyof StoryAnswers>(
  field: Field,
  value: StoryAnswers[Field],
) => void;

/** A translation key per field that has a mistake. */
export type StoryFieldErrors = Partial<Record<keyof StoryAnswers, string>>;

/**
 * Turns zod's issues into one message key per field (the first issue wins).
 *
 * @param issues - from safeParse
 * @returns the field errors
 */
export function toStoryFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): StoryFieldErrors {
  const errors: StoryFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0] as keyof StoryAnswers | undefined;
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
