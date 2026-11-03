/**
 * The landing page contract: the theme, the fixed blocks and their limits (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who uses it: the landing page store (src/features/landing-pages/api/landingPages.ts) parses
 * every version it reads with these schemas, the editor uses the limits for its counters, and the
 * public page draws each block from them. The database checks the same limits before publishing
 * (landing_block_field_rules() and landing_page_problems() in …_contests_a1_landing_pages.sql),
 * so the counter and the server agree.
 * Why fixed blocks: there is no free HTML, no script and no colour of the admin's own (criterion
 * 2). Part a2a adds pictures in the Hero and Text blocks and the Featured stories block; Remind me
 * arrives in part a2b; the sponsor block waits for sponsor campaigns (bundle 14).
 */
import { z } from 'zod';

/** The three kinds of page (criterion 1). */
export const landingPageTypes = ['contest', 'campaign', 'information'] as const;
export type LandingPageType = (typeof landingPageTypes)[number];

/** The four brand themes (criterion 2; proposal: the pill palette's four main tints). */
export const landingThemes = ['plum', 'gold', 'sage', 'sky'] as const;
export type LandingTheme = (typeof landingThemes)[number];

/** The block kinds of this part, in the order the "Add a block" menu lists them. */
export const landingBlockKinds = [
  'hero',
  'text',
  'key_dates',
  'who_can_enter',
  'prize',
  'how_to_enter',
  'rules',
  'questions',
  'featured',
] as const;
export type LandingBlockKind = (typeof landingBlockKinds)[number];

/** The two languages a page is written in, side by side (criterion 3). */
export const landingLanguages = ['ro', 'en'] as const;
export type LandingLanguage = (typeof landingLanguages)[number];

/** The platform age groups who can enter (S1-E11-15). */
export const landingAgeGroups = ['13_to_15', '16_to_17', '18_and_over'] as const;
export type LandingAgeGroup = (typeof landingAgeGroups)[number];

/**
 * The text fields of each block kind with their limits and whether they are required. The same
 * table is landing_block_field_rules() in the database.
 */
export const landingFieldRules: Record<
  LandingBlockKind,
  readonly { field: string; longest: number; isRequired: boolean }[]
> = {
  hero: [
    { field: 'title', longest: 80, isRequired: true },
    { field: 'intro', longest: 300, isRequired: false },
  ],
  text: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 4000, isRequired: true },
  ],
  key_dates: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'note', longest: 300, isRequired: false },
  ],
  who_can_enter: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 1000, isRequired: true },
  ],
  prize: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 1000, isRequired: true },
  ],
  how_to_enter: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 2000, isRequired: true },
  ],
  rules: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 1000, isRequired: false },
    { field: 'link_label', longest: 80, isRequired: true },
  ],
  questions: [{ field: 'heading', longest: 80, isRequired: true }],
  featured: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'intro', longest: 300, isRequired: false },
  ],
};

/** The blocks that may carry a picture, and the longest its alt text may be (part a2a). */
export const landingPictureKinds: readonly LandingBlockKind[] = ['hero', 'text'];
export const landingAltLongest = 200;

/** The most stories a Featured block picks by hand or shows (part a2a). */
export const landingMostFeatured = 12;

/** How a Featured block picks its stories. */
export const landingFeaturedModes = ['hand', 'tag'] as const;
export type LandingFeaturedMode = (typeof landingFeaturedModes)[number];

/** The limits of one question and its answer. */
export const landingQuestionLimits = { question: 200, answer: 1000 } as const;

/** The most blocks a page may hold. */
export const landingMostBlocks = 30;

/** One question and its answer, in one language. */
const questionItemSchema = z.object({ question: z.string(), answer: z.string() });

/** One language's words of a block: text fields by name, and questions for that block kind. */
const blockWordsSchema = z
  .object({ items: z.array(questionItemSchema).optional() })
  .catchall(z.union([z.string(), z.array(questionItemSchema)]));
export type LandingBlockWords = z.infer<typeof blockWordsSchema>;

/** The key dates, shared by both languages (ISO dates, empty while not chosen). */
const keyDatesSchema = z.object({
  entries_open: z.string(),
  entries_close: z.string(),
  results: z.string(),
});

/** One block: its kind, its words in each language and the fields both languages share. */
export const landingBlockSchema = z.object({
  /** A stable key for the editor's list; never shown. */
  id: z.string(),
  kind: z.enum(landingBlockKinds),
  ro: blockWordsSchema,
  en: blockWordsSchema,
  /** key_dates only. */
  dates: keyDatesSchema.optional(),
  /** who_can_enter only. */
  age_groups: z.array(z.enum(landingAgeGroups)).optional(),
  /** rules only: one of our pages ("/help/contest-rules") or an https address. */
  link: z.string().optional(),
  /** hero and text only: an uploaded picture; its alt text is "alt" in each language. */
  picture_id: z.string().optional(),
  /** featured only: by hand (story addresses) or by tag. */
  mode: z.enum(landingFeaturedModes).optional(),
  story_slugs: z.array(z.string()).optional(),
  tag: z.string().optional(),
});
export type LandingBlock = z.infer<typeof landingBlockSchema>;

/** A version's content. */
export const landingContentSchema = z.object({
  theme: z.enum(landingThemes),
  blocks: z.array(landingBlockSchema),
});
export type LandingContent = z.infer<typeof landingContentSchema>;

/** A picture as picture_state_json() describes it. */
const storedPictureSchema = z.object({
  state: z.string(),
  bucket: z.string().nullable(),
  path: z.string().nullable(),
});

/** The public read of /c/<slug> (landing_page()). */
export const publicLandingPageSchema = z.object({
  slug: z.string(),
  type: z.enum(landingPageTypes),
  state: z.enum(['live', 'ended']),
  show_from: z.string(),
  take_down_on: z.string().nullable(),
  content: landingContentSchema,
  /** Part a2a: the pictures the visitor may see, by picture ID. */
  pictures: z.record(z.string(), storedPictureSchema).default({}),
  /** Part a2a: each Featured block's story cards (story_card_json()), by block ID. */
  featured: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).default({}),
});
export type PublicLandingPage = z.infer<typeof publicLandingPageSchema>;
