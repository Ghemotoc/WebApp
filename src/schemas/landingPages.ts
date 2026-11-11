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
 * arrives in part a2b; the sponsor block waits for sponsor campaigns (bundle 14). The page builder
 * (S1-E11-34, CMS-2b) adds picture and text, cards, steps, a quote and a call to action, and the
 * menu's families.
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
  'remind_me',
  // S1-E11-34 (CMS-2b): the page builder's new blocks.
  'picture_text',
  'cards',
  'steps',
  'quote',
  'call_to_action',
] as const;
export type LandingBlockKind = (typeof landingBlockKinds)[number];

/**
 * The "Add a block" menu's families, in order, each with its blocks (S1-E11-34 criterion 1; the
 * idea of block families comes from Engage Grow Hub's builder, ideas only).
 */
export const landingBlockFamilies = [
  { family: 'top', kinds: ['hero'] },
  { family: 'words', kinds: ['text', 'picture_text', 'quote'] },
  { family: 'lists', kinds: ['cards', 'steps', 'questions'] },
  { family: 'contest', kinds: ['key_dates', 'who_can_enter', 'prize', 'how_to_enter', 'rules'] },
  { family: 'stories', kinds: ['featured'] },
  { family: 'ending', kinds: ['call_to_action', 'remind_me'] },
] as const satisfies readonly { family: string; kinds: readonly LandingBlockKind[] }[];
export type LandingBlockFamily = (typeof landingBlockFamilies)[number]['family'];

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
  remind_me: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'intro', longest: 300, isRequired: false },
  ],
  picture_text: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 2000, isRequired: true },
  ],
  cards: [{ field: 'heading', longest: 80, isRequired: true }],
  steps: [{ field: 'heading', longest: 80, isRequired: true }],
  quote: [
    { field: 'quote', longest: 300, isRequired: true },
    { field: 'source', longest: 80, isRequired: false },
  ],
  call_to_action: [
    { field: 'heading', longest: 80, isRequired: true },
    { field: 'body', longest: 300, isRequired: false },
    { field: 'button_label', longest: 40, isRequired: true },
  ],
};

/** The blocks that may carry a picture, and the longest its alt text may be (part a2a). */
export const landingPictureKinds: readonly LandingBlockKind[] = ['hero', 'text', 'picture_text'];

/** The blocks that link somewhere: one of our pages or an https address. */
export const landingLinkKinds: readonly LandingBlockKind[] = ['rules', 'call_to_action'];

/** The blocks made of a list of entries (a title and a few words each), and how many each holds. */
export const landingEntryCounts = {
  cards: { fewest: 2, most: 4 },
  steps: { fewest: 2, most: 6 },
} as const;
export type LandingEntryKind = keyof typeof landingEntryCounts;

/** The limits of one card or step. */
export const landingEntryLimits = { title: 80, body: 300 } as const;
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

/** One card or step, in one language (S1-E11-34). */
const entryItemSchema = z.object({ title: z.string(), body: z.string() });
export type LandingEntry = z.infer<typeof entryItemSchema>;

/**
 * One language's words of a block: text fields by name, questions for a Questions block and
 * entries for Cards and Steps.
 */
const blockWordsSchema = z
  .object({
    items: z.array(questionItemSchema).optional(),
    entries: z.array(entryItemSchema).optional(),
  })
  .catchall(z.union([z.string(), z.array(questionItemSchema), z.array(entryItemSchema)]));
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
  /** rules and call_to_action: one of our pages ("/help/contest-rules") or an https address. */
  link: z.string().optional(),
  /** hero, text and picture_text: an uploaded picture; its alt text is "alt" in each language. */
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

/**
 * A Remind me block's state for the reader (landing_reminder_json(), part a2b): when entries open,
 * whether they are open already and whether this reader asked to be reminded.
 */
export const landingReminderSchema = z.object({
  opens_on: z.string().nullable(),
  is_open: z.boolean(),
  is_set: z.boolean(),
});
export type LandingReminder = z.infer<typeof landingReminderSchema>;

/**
 * One published contest result (contest_results_json(), contests part 13b2b): winner or finalist,
 * the writer's pen name only, and the story when the visitor may open it (S1-E11-15 criterion 8).
 */
export const landingResultSchema = z.object({
  placing: z.enum(['winner', 'finalist']),
  pen_name: z.string(),
  story: z.object({ slug: z.string(), title: z.string() }).nullable(),
});
export type LandingResult = z.infer<typeof landingResultSchema>;

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
  /** Part a2b: the Remind me state for this reader, or null when the page has no such block. */
  reminder: landingReminderSchema.nullable().default(null),
  /** Contests part b2b: the contest's published results, or null. */
  results: z.array(landingResultSchema).nullable().default(null),
});
export type PublicLandingPage = z.infer<typeof publicLandingPageSchema>;
