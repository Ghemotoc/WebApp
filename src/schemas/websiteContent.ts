/**
 * The website content contract: the shape of each kind of CMS content and its limits (stories
 * S1-E11-06, S1-E11-10 and S1-E11-12; architecture 1.8.6, B31).
 *
 * Who uses it: the WebsiteContentStore (src/features/website/api/websiteContentStore.ts) parses
 * every row it reads with these schemas, and the editors (src/features/website/) use the limits
 * for their counters. The database checks the same limits before publishing
 * (cms_content_problems() in …_s1_e11_06_website_cms.sql), so the counter and the server agree.
 * When the website gets its own database (set-up OPEN), its store parses the same shapes.
 */
import { z } from 'zod';

/** The four kinds of website content, one store table for all of them. */
export const websiteContentKinds = ['home_page', 'notice', 'help_page', 'question'] as const;
export type WebsiteContentKind = (typeof websiteContentKinds)[number];

/**
 * The home page's limits (proposals in S1-E11-06 criterion 5). The headline's two lines share
 * 40 characters between them.
 */
export const homePageLimits = {
  eyebrow: 50,
  headline: 40,
  lede: 170,
  button: 20,
  point: 30,
  sectionHeading: 60,
  cardTitle: 60,
  cardBody: 260,
  safetyLine: 200,
  rightsEyebrow: 30,
  rightsTitle: 60,
  rightsLine: 60,
} as const;

/** One "Why write here" card. */
const whyCardSchema = z.object({ title: z.string(), body: z.string() });

/**
 * The gold "Your rights" card on the hero's cover wall (board Website-Home; bundle LOOK-2).
 * Optional, so versions saved before it existed still read; the page leaves it out while its
 * title is empty.
 */
const rightsCardSchema = z.object({ eyebrow: z.string(), title: z.string(), body: z.string() });
export type HomeRightsCard = z.infer<typeof rightsCardSchema>;

/** The home page, one per market and language. */
export const homePageContentSchema = z.object({
  eyebrow: z.string(),
  headlineFirst: z.string(),
  headlineSecond: z.string(),
  /** The word of the headline that gets the gold underline (decoration only). */
  underlinedWord: z.string(),
  lede: z.string(),
  primaryButton: z.string(),
  secondaryButton: z.string(),
  /** Three short points under the buttons. */
  points: z.array(z.string()).length(3),
  rightsCard: rightsCardSchema.optional(),
  whyHeading: z.string(),
  /** Four cards under "Why write here". */
  whyCards: z.array(whyCardSchema).length(4),
  safetyHeading: z.string(),
  /** The Yoti line and the one messaging line (S1-E5-08). */
  safetyLines: z.array(z.string()).length(2),
  questionsHeading: z.string(),
});
export type HomePageContent = z.infer<typeof homePageContentSchema>;

/** Where a question shows (S1-E11-12 criterion 2). */
export const questionPlaces = ['home', 'help', 'both'] as const;
export type QuestionPlace = (typeof questionPlaces)[number];

/** The question limits: the question and its answer (safe Markdown). */
export const questionLimits = { question: 160, answer: 1500 } as const;

/** A question, one per market and language. */
export const questionContentSchema = z.object({
  question: z.string(),
  /** The answer, in the safe Markdown subset. */
  answer: z.string(),
  position: z.number().int(),
  showOn: z.enum(questionPlaces),
  /** Legal wording (age, consent, privacy, reporting, messaging, money): the editor reminds staff. */
  isLegal: z.boolean().default(false),
});
export type QuestionContent = z.infer<typeof questionContentSchema>;

/** The help page limits. */
export const helpPageLimits = { title: 80, section: 40, body: 20000 } as const;

/** A help page, one per market and language; its address is the entry key. */
export const helpPageContentSchema = z.object({
  title: z.string(),
  section: z.string(),
  /** The page, in the safe Markdown subset. */
  body: z.string(),
  isLegal: z.boolean().default(false),
});
export type HelpPageContent = z.infer<typeof helpPageContentSchema>;

/** A notice's types; each has its own design-token colours (S1-E11-10). */
export const noticeTypes = ['news', 'contest', 'important'] as const;
export type NoticeType = (typeof noticeTypes)[number];

/** Where a notice shows. */
export const noticePlaces = ['all', 'home'] as const;
export type NoticePlace = (typeof noticePlaces)[number];

/** A notice's text limit, in each language (proposal in S1-E11-10). */
export const noticeTextLimit = 120;

/** A notice: one per market, with the text in every language of the market. */
export const noticeContentSchema = z.object({
  /** The text by language code ("ro", "en"). */
  texts: z.record(z.string(), z.string()),
  /** An optional link to one of our own pages ("/discover"). */
  link: z.string().nullable().default(null),
  noticeType: z.enum(noticeTypes),
  showOn: z.enum(noticePlaces),
});
export type NoticeContent = z.infer<typeof noticeContentSchema>;

/** Every entry key: a lower-case web address part (the database checks the same pattern). */
export const entryKeySchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/);
