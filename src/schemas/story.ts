/**
 * The new story form's rules, shared by the form and any later server code that checks the same
 * answers (story S1-E3-01; architecture 1.5: one zod schema in the browser and on the server).
 *
 * Who uses it: useNewStoryForm (src/features/writing/hooks/) checks the answers before sending
 * them to create_story(). The database checks them again (supabase/migrations/…_s1_e3_01_stories.sql),
 * because the screen is never the protection (architecture 1.1, principle 3).
 * Each message is a translation key in src/locales/<language>/writing.json.
 */
import { z } from 'zod';

import { coverColourKeys, coverDesignKeys } from '@/components/covers/coverDesigns';
import { MAXIMUM_TAG_LENGTH, MAXIMUM_TAGS, normaliseTag } from '@/features/writing/lib/tags';

/** The title's limits (board 4.2: maxlength 120). */
export const MAXIMUM_TITLE_LENGTH = 120;

/** The blurb's limit (board 4.2: "of 500 characters"). */
export const MAXIMUM_BLURB_LENGTH = 500;

/** A cover choice: automatic (nothing stored) or drawn (a design and two palette colours). */
export const storyCoverSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('automatic') }),
  z.object({
    kind: z.literal('drawn'),
    design: z.enum(coverDesignKeys),
    background: z.enum(coverColourKeys),
    accent: z.enum(coverColourKeys),
  }),
]);

/** A cover choice as the form keeps it. */
export type StoryCoverChoice = z.infer<typeof storyCoverSchema>;

/** The answers on the new story form. */
export const newStorySchema = z.object({
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
});

/** The checked answers. */
export type NewStoryInput = z.infer<typeof newStorySchema>;
