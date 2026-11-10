/**
 * The answers a story form keeps while the writer types, shared by the new story form
 * (S1-E3-01) and story settings (S1-E3-05), with the labels (S1-E3-06).
 *
 * Who uses it: useNewStoryForm, useStorySettingsForm and every form section in
 * src/features/writing/components/ (they read `answers` and call `set`).
 * Why one type: the sections are the same on both screens (the basics, category and tags, the
 * cover), so they take one shape and don't care which screen they are on.
 */
import type {
  AiDisclosure,
  StoryCoverChoice,
  StoryRating,
  StoryRatingReason,
  StoryVisibility,
} from '@/schemas/story';

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
  /** Who can read it (NEW-1); public for a new story, changed in its settings. */
  visibility: StoryVisibility;
  /**
   * "In the app only" (S1-E3-08, GAPS-15): saved now, applies once the apps exist and staff turn
   * the 'app_only_stories' switch on; false for a new story.
   */
  isAppOnly: boolean;
  /** Whether readers may comment (S1-E3-05; enforced by S1-E6-01); on for a new story. */
  commentsEnabled: boolean;
  /** The quote card switch (S1-E4-07); since S1-E4-11 it covers passage links too. */
  quoteCardsEnabled: boolean;
  /** Whether readers may share the chapters' pictures (S1-E4-11); on for a new story. */
  pictureSharingEnabled: boolean;
  /** The palette colour readers' new quote and picture cards start in (IDEAS-1c); null for our default. */
  cardColour: string | null;
  /** All ages, 13+, 16+ or 18+ (S1-E3-06); null until the writer picks one (required). */
  rating: StoryRating | null;
  isFanFiction: boolean;
  isParody: boolean;
  /** Abuse or coercion as a theme: then 16+ or 18+ and a content note (17 Oct 2026). */
  dealsWithAbuseOrCoercion: boolean;
  /** A short warning readers see before they open the story; up to 300 characters. */
  contentNote: string;
  /** The AI answer (Q24); null until the writer picks one (required). */
  aiDisclosure: AiDisclosure | null;
  /** Why it is 16+ or 18+ (SPONSORS-f); at least one for those ratings, none below. */
  ratingReasons: StoryRatingReason[];
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
