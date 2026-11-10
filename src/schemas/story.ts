/**
 * The story forms' rules, shared by the forms and any later server code that checks the same
 * answers (stories S1-E3-01, S1-E3-05, S1-E3-06; architecture 1.5: one zod schema in the
 * browser and on the server).
 *
 * Who uses it: useNewStoryForm (src/features/writing/hooks/) checks the answers before sending
 * them to create_story(). The database checks them again (supabase/migrations/…_s1_e3_01_stories.sql),
 * because the screen is never the protection (architecture 1.1, principle 3).
 * Each message is a translation key in src/locales/<language>/writing.json.
 */
import { z } from 'zod';

import { coverColourKeys, coverDesignKeys } from '@/components/covers/coverDesigns';
import { MAXIMUM_TAG_LENGTH, MAXIMUM_TAGS, normaliseTag } from '@/features/writing/lib/tags';
import type { Database } from '@/lib/database.types';

/** The title's limits (board 4.2: maxlength 120). */
export const MAXIMUM_TITLE_LENGTH = 120;

/** The blurb's limit (board 4.2: "of 500 characters"). */
export const MAXIMUM_BLURB_LENGTH = 500;

/**
 * A cover choice: automatic (nothing stored), drawn (a design and two palette colours) or an
 * uploaded picture (its path in the covers bucket, registered for the picture check, S1-E10-05).
 */
export const storyCoverSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('automatic') }),
  z.object({ kind: z.literal('upload'), tallPath: z.string().min(1).max(200) }),
  z.object({
    kind: z.literal('drawn'),
    design: z.enum(coverDesignKeys),
    background: z.enum(coverColourKeys),
    accent: z.enum(coverColourKeys),
  }),
]);

/** A cover choice as the form keeps it. */
export type StoryCoverChoice = z.infer<typeof storyCoverSchema>;

/**
 * The cover as create_story() and update_my_story() read it: an upload's path travels as
 * tall_path (the database's name); the other kinds go as they are.
 *
 * @param cover - the form's choice
 * @returns the JSON for the database
 */
export function coverJsonFor(cover: StoryCoverChoice): Record<string, string> {
  if (cover.kind === 'upload') return { kind: 'upload', tall_path: cover.tallPath };
  return { ...cover };
}

/** The four ratings, youngest first (Q17; the database enum story_rating). */
export const storyRatings = ['all_ages', '13_plus', '16_plus', '18_plus'] as const;

/** A rating as stored. */
export type StoryRating = Database['public']['Enums']['story_rating'];

/** The youngest reader each rating allows; the copy says "hidden from anyone under N". */
export const ratingMinimumAge: Record<StoryRating, number> = {
  all_ages: 0,
  '13_plus': 13,
  '16_plus': 16,
  '18_plus': 18,
};

/** The writer's AI answers (Q24; the database enum ai_disclosure). */
export const aiDisclosures = ['no_ai', 'ai_brainstorming', 'partly_ai_written'] as const;

/** An AI answer as stored. */
export type AiDisclosure = Database['public']['Enums']['ai_disclosure'];

/**
 * Why a story is 16+ or 18+ (SPONSORS-f; Robert, 2 Nov 2026), in the form's order. The database
 * enum story_rating_reason holds the same list.
 */
export const storyRatingReasons = [
  'sexual_content',
  'nudity',
  'graphic_violence',
  'strong_language',
  'drugs',
  'self_harm',
  'dark_themes',
] as const satisfies readonly Database['public']['Enums']['story_rating_reason'][];

/** One reason as stored. */
export type StoryRatingReason = Database['public']['Enums']['story_rating_reason'];

/** The ratings that need reasons (SPONSORS-f). */
export const ratingsWithReasons: readonly StoryRating[] = ['16_plus', '18_plus'];

/** The content note's limit (S1-E3-06). */
export const MAXIMUM_CONTENT_NOTE_LENGTH = 300;

/** The ratings that may carry abuse or coercion as a theme (17 Oct 2026, 10:36). */
const ratingsAllowingAbuseTheme: readonly StoryRating[] = ['16_plus', '18_plus'];

/**
 * The labels (S1-E3-06): the rating and the AI answer are required; a story about abuse or
 * coercion must be 16+ or 18+ with a content note. The database checks the same rules in
 * check_story_labels().
 */
const storyLabelsShape = {
  rating: z.enum(storyRatings, { error: 'errors.ratingRequired' }),
  isFanFiction: z.boolean(),
  isParody: z.boolean(),
  dealsWithAbuseOrCoercion: z.boolean(),
  contentNote: z.string().trim().max(MAXIMUM_CONTENT_NOTE_LENGTH, 'errors.contentNoteTooLong'),
  aiDisclosure: z.enum(aiDisclosures, { error: 'errors.aiRequired' }),
  // Why it is 16+ or 18+ (SPONSORS-f); the rules below ask for at least one then.
  ratingReasons: z.array(z.enum(storyRatingReasons)),
};

/** The labels the rules that span fields read. */
interface LabelsForRules {
  dealsWithAbuseOrCoercion: boolean;
  rating: StoryRating;
  contentNote: string;
  ratingReasons: StoryRatingReason[];
}

/**
 * The rules that span fields: 16+ and 18+ say why (SPONSORS-f), and abuse or coercion as a theme
 * needs 16+ or 18+ and a content note (17 Oct 2026, 10:36). Applied last, because zod drops
 * refinements when a schema is extended.
 */
function labelRules(labels: LabelsForRules, context: z.RefinementCtx) {
  // Step 0: a 16+ or 18+ story says why (Robert, 2 Nov 2026; network ads read the reasons).
  if (ratingsWithReasons.includes(labels.rating) && labels.ratingReasons.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['ratingReasons'],
      message: 'errors.ratingReasonsMissing',
    });
  }
  if (!labels.dealsWithAbuseOrCoercion) return;
  // Step 1: abuse or coercion as a theme needs the 16+ or 18+ rating.
  if (!ratingsAllowingAbuseTheme.includes(labels.rating)) {
    context.addIssue({ code: 'custom', path: ['rating'], message: 'errors.abuseNeedsRating' });
  }
  // Step 2: and a content note, so readers know before they open it.
  if (labels.contentNote === '') {
    context.addIssue({ code: 'custom', path: ['contentNote'], message: 'errors.abuseNeedsNote' });
  }
}

/** The answers on the new story form, before the rules that span fields. */
const newStoryShape = z.object({
  // The form makes the story's ID (crypto.randomUUID()) so the automatic cover is known before
  // the story exists (S1-E3-13); the database refuses an ID already in use.
  storyId: z.uuid('errors.storyIdInvalid'),
  title: z
    .string()
    .trim()
    .min(1, 'errors.titleMissing')
    .max(MAXIMUM_TITLE_LENGTH, 'errors.titleTooLong'),
  blurb: z.string().trim().max(MAXIMUM_BLURB_LENGTH, 'errors.blurbTooLong'),
  languageCode: z.string().min(1, 'errors.languageMissing'),
  categorySlug: z.string().min(1, 'errors.categoryMissing'),
  tags: z
    .array(z.string().trim().min(1).max(MAXIMUM_TAG_LENGTH, 'errors.tagTooLong'))
    .max(MAXIMUM_TAGS, 'errors.tooManyTags')
    // Look-alikes count as one tag, so two of them are a mistake the form prevents.
    .refine((tags) => new Set(tags.map(normaliseTag)).size === tags.length, 'errors.duplicateTag'),
  cover: storyCoverSchema,
  ...storyLabelsShape,
});

/** The new story form's answers, with the label rules (S1-E3-06). */
export const newStorySchema = newStoryShape.superRefine(labelRules);

/** The checked answers. */
export type NewStoryInput = z.infer<typeof newStorySchema>;

/**
 * The colours a writer may pick for their story's quote and picture cards (IDEAS-1c): the board's
 * nine palette colours. The database's stories_card_colour_on_palette check holds the same list.
 */
export const cardColourKeys = [
  'plum',
  'violet',
  'gold',
  'ink',
  'lilac',
  'blush',
  'sky',
  'sage',
  'paper',
] as const;

/** Who can read a story (NEW-1): everyone, anyone with the link, or only the writer. */
export const storyVisibilities = ['public', 'unlisted', 'private'] as const;

/** One of storyVisibilities. */
export type StoryVisibility = (typeof storyVisibilities)[number];

/** The story settings form's answers (S1-E3-05): the same fields plus status, comments and the sharing switches. */
export const storySettingsSchema = newStoryShape
  .omit({ storyId: true })
  .extend({
    completionStatus: z.enum(['ongoing', 'completed']),
    commentsEnabled: z.boolean(),
    /** The writer's switch for quote cards (S1-E4-07) and passage links (S1-E4-11). */
    quoteCardsEnabled: z.boolean(),
    /** The writer's switch for sharing the chapters' pictures (S1-E4-11). */
    pictureSharingEnabled: z.boolean(),
    /** The palette colour readers' new cards start in, or null for our default (IDEAS-1c). */
    cardColour: z.enum(cardColourKeys).nullable(),
    /** Who can read it (NEW-1); saved through its own function. */
    visibility: z.enum(storyVisibilities),
    /** "In the app only" (S1-E3-08, GAPS-15); saved through its own function. */
    isAppOnly: z.boolean(),
  })
  .superRefine(labelRules);

/** The checked settings. */
export type StorySettingsInput = z.infer<typeof storySettingsSchema>;
