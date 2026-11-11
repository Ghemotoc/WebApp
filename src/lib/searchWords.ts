/**
 * The words search engines and share cards get for the website's own pages and the landing
 * pages, and what is missing from them (stories S1-E11-37, S1-E11-38 and S1-E11-39; bundle SEO-1).
 *
 * Why it exists: two places need the same answer. The Cloudflare handlers write the real tags
 * (server/website-head.ts for "/" and "/help/<address>", server/landing-preview.ts for
 * "/c/<name>"), and Staff › Website › Search and sharing shows staff what those tags will say
 * and what to fix. Keeping the rules here, once, means the screen can never promise something the
 * real tags don't do. The rule is the same everywhere: staff's search title and description win,
 * and an empty field falls back to the page's own words (the home page's headline and
 * introduction, a help page's title and first lines, a landing page's hero title and
 * introduction).
 * The checks follow common search guidance (the SEO-1 research doc): a title of about 30 to 60
 * characters and a description of about 70 to 160 show whole in search results, every page needs
 * a share picture with alt text, and every page has exactly one main heading.
 * Who calls it: the two server handlers above, and src/features/website/lib/searchPageReport.ts.
 * What it calls: nothing; plain functions with no imports.
 */

/** The longest description written from a website page's own words; longer text is cut at a word. */
export const WEBSITE_DESCRIPTION_LONGEST = 160;

/** The longest description written from a landing page's introduction (S1-E11-14 criterion 13). */
export const LANDING_DESCRIPTION_LONGEST = 200;

/** The lengths search results show whole (S1-E11-39). */
export const searchLengthGuide = {
  titleShortest: 30,
  titleLongest: 60,
  descriptionShortest: 70,
  descriptionLongest: 160,
} as const;

/** What search engines and share cards get for one page. */
export interface PageSearchWords {
  /** The title, without the site's name. */
  title: string;
  /** The description; empty when the page has no words to use. */
  description: string;
  /** True when staff asked search engines not to list the page. */
  isHidden: boolean;
}

/**
 * A text from stored content, trimmed, or an empty text when it isn't one.
 *
 * @param value - whatever the content holds there
 * @returns the text
 */
export function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Shortens a text at a word, with an ellipsis, so search results and cards stay readable.
 *
 * @param text - the text
 * @param longest - the most characters it may keep
 * @returns the text, at most `longest` characters plus the ellipsis
 */
export function shortenedAtWord(text: string, longest: number): string {
  if (text.length <= longest) return text;
  const cut = text.slice(0, longest);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Turns a help page's safe Markdown into one line of plain words: links keep their text, and the
 * marks for headings, lists, bold, italics, quotes and code go.
 *
 * @param markdown - the help page's body
 * @returns the words, on one line
 */
export function plainWordsOf(markdown: string): string {
  // Step 1: a link keeps only its text ("[report a story](/help/report)" → "report a story").
  const withoutLinks = markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Step 2: the formatting marks go; every run of spaces and line breaks becomes one space.
  return withoutLinks
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Staff's search fields win; an empty one keeps the page's own words.
 *
 * @param search - the page's search fields, as stored (any part may be missing)
 * @param ownWords - the page's own title and description
 * @returns the words the tags carry
 */
function withSearchFields(
  search: unknown,
  ownWords: { title: string; description: string },
): PageSearchWords {
  const fields = (typeof search === 'object' && search !== null ? search : {}) as Record<
    string,
    unknown
  >;
  const searchTitle = textOf(fields.title);
  const searchDescription = textOf(fields.description);
  return {
    title: searchTitle === '' ? ownWords.title : searchTitle,
    description: searchDescription === '' ? ownWords.description : searchDescription,
    isHidden: fields.hidden === true,
  };
}

/**
 * The words for a website page: the home page or a help page (S1-E11-37).
 *
 * @param kind - which kind of page it is
 * @param content - the live version's content
 * @returns the title, the description and whether it is hidden from search engines
 */
export function websitePageWords(
  kind: 'home_page' | 'help_page',
  content: Record<string, unknown>,
): PageSearchWords {
  // Step 1: the page's own words: the headline and introduction, or the title and first lines.
  const ownWords =
    kind === 'home_page'
      ? {
          title: `${textOf(content.headlineFirst)} ${textOf(content.headlineSecond)}`.trim(),
          description: shortenedAtWord(textOf(content.lede), WEBSITE_DESCRIPTION_LONGEST),
        }
      : {
          title: textOf(content.title),
          description: shortenedAtWord(
            plainWordsOf(textOf(content.body)),
            WEBSITE_DESCRIPTION_LONGEST,
          ),
        };
  // Step 2: staff's search fields win.
  return withSearchFields(content.search, ownWords);
}

/** The parts of a landing page's content the words read. */
interface LandingContentForWords {
  blocks?: ReadonlyArray<{ kind?: string; ro?: { title?: unknown; intro?: unknown } }>;
  search?: { hidden?: unknown; ro?: unknown };
}

/**
 * The words for a landing page: its hero's Romanian title and introduction, or staff's Romanian
 * search fields (S1-E11-38). The tags use Romanian, as the interface opens in Romanian for
 * everyone (decided 17 Oct 2026).
 *
 * @param content - the live version's content
 * @returns the title, the description and whether it is hidden from search engines
 */
export function landingPageWords(content: LandingContentForWords): PageSearchWords {
  // Step 1: the hero's own words.
  const hero = (content.blocks ?? []).find((block) => block.kind === 'hero');
  const ownWords = {
    title: textOf(hero?.ro?.title),
    description: shortenedAtWord(textOf(hero?.ro?.intro), LANDING_DESCRIPTION_LONGEST),
  };
  // Step 2: staff's Romanian search fields win; the switch is shared by both languages.
  const words = withSearchFields(content.search?.ro, ownWords);
  return { ...words, isHidden: content.search?.hidden === true };
}

/** A warning the Search and sharing screen shows for a page (S1-E11-39). */
export type SearchWarning =
  | 'no_description'
  | 'title_short'
  | 'title_long'
  | 'description_short'
  | 'description_long'
  | 'no_share_picture'
  | 'picture_without_alt'
  | 'main_heading_count';

/** What the checks need to know about a page. */
export interface SearchCheckInput {
  words: PageSearchWords;
  /** True when the page's share card carries a picture. */
  hasSharePicture: boolean;
  /** How many pictures on the page (the share picture included) have no alt text. */
  picturesWithoutAlt: number;
  /** How many main headings (h1) the page shows. */
  mainHeadings: number;
}

/**
 * The length warnings for a title and a description.
 *
 * @param words - the page's words
 * @returns the warnings, in the order the screen lists them
 */
function lengthWarnings(words: PageSearchWords): SearchWarning[] {
  const warnings: SearchWarning[] = [];
  if (words.title.length < searchLengthGuide.titleShortest) warnings.push('title_short');
  if (words.title.length > searchLengthGuide.titleLongest) warnings.push('title_long');
  // A missing description is one warning, not also "too short".
  if (words.description === '') return [...warnings, 'no_description'];
  if (words.description.length < searchLengthGuide.descriptionShortest) {
    warnings.push('description_short');
  }
  if (words.description.length > searchLengthGuide.descriptionLongest) {
    warnings.push('description_long');
  }
  return warnings;
}

/**
 * Everything missing from a page's search and share tags (S1-E11-39).
 *
 * @param input - the page's words, share picture, pictures and headings
 * @returns the warnings, empty when nothing is missing
 */
export function searchWarnings(input: SearchCheckInput): SearchWarning[] {
  const warnings = lengthWarnings(input.words);
  if (!input.hasSharePicture) warnings.push('no_share_picture');
  if (input.picturesWithoutAlt > 0) warnings.push('picture_without_alt');
  if (input.mainHeadings !== 1) warnings.push('main_heading_count');
  return warnings;
}
