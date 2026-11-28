/**
 * Link previews and search engine tags for shared story and chapter links (story S1-E4-04;
 * decided 16 Oct 2026, Q36; Q13 option B, see scripts/make-link-preview-images.ts).
 *
 * Why it exists: WhatsApp, Instagram, TikTok and search engines read a page's HTML without
 * running its JavaScript, so a single-page app alone shows them an empty page. For every address
 * under /s/ this handler takes the app's index.html, asks the database what a visitor who isn't
 * logged in may see (get_link_preview(), never the tables and never chapter text) and writes
 * into the page's <head>:
 * - <title>, the description, the Open Graph tags (og:title, og:description, og:image, og:url,
 *   og:site_name), the Twitter card and a canonical link, so every app shows the same card: title,
 *   pen name, category, blurb and a plain picture in the drawn cover's colour (plum otherwise);
 * - for story pages, JSON-LD (schema.org CreativeWork) with the title, blurb, pen name, category
 *   (`genre`) and tags (`keywords`), and a keywords meta tag with the category and tags;
 * - for unknown addresses, shared passages and chapters visitors get no text from (16+ and 18+),
 *   <meta name="robots" content="noindex"> and the same rule in an X-Robots-Tag header. Story pages
 *   are indexable (Q36), and so are a classic's chapters, read whole; a writer's chapters are not
 *   (GROWTH-4, Robert, 26 Nov 2026, 19:45 UTC: "the chapters of user generated content should not
 *   be crawlable, just the book page ... Only the classics all chapters can be indexable").
 * Every story gets the same details whatever its rating, and the rating itself is never shown
 * (Robert, 11 Nov 2026; S1-E11-36, replacing Q6's "title and rating only"). An 18+ story adds a
 * plain "For mature readers" note (16+ adds nothing). A 16+ or 18+ story still never shares a
 * passage or a picture, because signed-out visitors can't read its text (Q6). Every value is
 * HTML-escaped, so a title like "<script>" stays text. If the database can't be reached, the page
 * goes out unchanged: the preview is a nicety, the page itself must always load.
 * Who calls it: functions/s/[[path]].ts on Cloudflare Pages, and server/pages-functions-plugin.ts
 * locally (npm run dev, npm run preview and the end-to-end tests).
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/get_link_preview with the public anon key.
 * A link to a spot in a chapter (/s/<story>/<chapter>/p3-5, S1-E4-11) shows the passage instead of
 * the blurb, from get_shared_passage() (server/shared-passage.ts); for 16+ and 18+ it never has
 * one, and the preview keeps the blurb. A link to one picture that may be shared
 * shows the picture itself as og:image, served by /api/picture-preview/… (server/picture-
 * preview.ts, IDEAS-2f); a picture still in its check or removed keeps the cover colour.
 * Never logged: the request, the visitor or any user text (CLAUDE.md rule 12).
 */
// The wording comes from the app's own locale files (CLAUDE.md rule 4). Nothing else from src/
// is imported: this file is also loaded with vite.config.ts, where the app's "@" paths don't exist.
// Plain JSON imports, without `with { type: 'json' }`: Cloudflare's Pages build bundles
// functions/ with an older esbuild that can't read import attributes ("Expected ';' but found
// 'with'"), and every bundler that loads this file (Wrangler, Vite, Vitest) inlines the JSON anyway.
import englishReading from '../src/locales/en/reading.json';
import englishWriting from '../src/locales/en/writing.json';
import romanianReading from '../src/locales/ro/reading.json';
import romanianWriting from '../src/locales/ro/writing.json';

import { parseSpot, type SpotRange } from '../src/lib/chapter-blocks.ts';
import {
  shortenForDescription,
  statementPageTitle,
  statementSentence,
  statementSiteLine,
  statementText,
  storyTypeOf,
  type StoryStatementFacts,
  type StoryStatementWords,
} from '../src/lib/story-statement.ts';

import { linkPreviewPalette } from './link-preview-palette.ts';
import {
  fetchSharedPicture,
  picturePreviewUrl,
  type PicturePreviewAddress,
} from './picture-preview.ts';
import { fetchSharedPassage } from './shared-passage.ts';

/**
 * A shared address: a story page (/s/<story>), a chapter (/s/<story>/<chapter>) or a spot in a
 * chapter (/s/<story>/<chapter>/p3-5, S1-E4-11).
 */
export interface SharedAddress {
  storySlug: string;
  chapterCode: string | null;
  /** The blocks of a shared passage or picture, or null. */
  spot: SpotRange | null;
}

/** What get_link_preview() says a visitor who isn't logged in may see. */
export interface LinkPreview {
  slug: string;
  title: string;
  rating: 'all_ages' | '13_plus' | '16_plus' | '18_plus';
  languageCode: string;
  /**
   * True for 16+ and 18+: visitors who aren't logged in never see the text, so no passage or
   * picture is shared (Q6, S1-E11-36).
   */
  hidesText: boolean;
  blurb: string | null;
  writerName: string | null;
  cover: { kind: string; background: string | null } | null;
  chapterTitle: string | null;
  /** The story's category (genre) key, for example "fiction", or null. */
  categorySlug: string | null;
  /** The story's approved tags in its language, at most ten. */
  tags: string[];
  /**
   * True for a public story; an unlisted story (NEW-1) still previews from its link but carries
   * noindex, as a chapter does (S1-E11-36).
   */
  isListed: boolean;
  /** "In the app only" while it applies (GAPS-15): kept out of search engines (CALM-9s). */
  isAppOnly: boolean;
  /**
   * True when the story is hidden in at least one country: its chapters stay out of search
   * engines, its book page stays in (COUNTRY-2, Robert, 27 Nov 2026).
   */
  isHiddenSomewhere: boolean;
  /** The story's genre, its first recommended tag in its language, or null (CALM-9s). */
  genre: string | null;
  /** The writer's username for the profile link; null for a classic, whose author has none. */
  writerHandle: string | null;
  /** When the story was first published and last changed, for the JSON-LD dates. */
  firstPublishedAt: string | null;
  updatedAt: string | null;
  /** The story's public editions (slug and language), for hreflang; empty in one language. */
  editions: { slug: string; languageCode: string }[];
  /** True when the address names a chapter. */
  isChapter: boolean;
  /** The shared passage as one plain line (S1-E4-11), or null. */
  passage: string | null;
  /**
   * For a link to one picture that may be shared: its spot and alt text, so the preview shows
   * the picture itself (IDEAS-2f); null otherwise, and the preview keeps the cover colour.
   */
  picture: { address: PicturePreviewAddress; alt: string } | null;
}

/** Where the database is: the same public values the app is built with. */
export interface DatabaseSettings {
  supabaseUrl: string;
  anonKey: string;
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface SharedLinkHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** The preview for an address, or null when there is none. */
  findPreview: (address: SharedAddress) => Promise<LinkPreview | null>;
}

/** The size of the pictures in public/link-previews/ (scripts/make-link-preview-images.ts). */
const PREVIEW_IMAGE_SIDE = 400;

/** Story addresses as the app makes them: lower-case letters, digits and hyphens. */
const storySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Chapter codes: 8 lower-case letters or digits (S1-E3-02a). */
const chapterCodePattern = /^[a-z0-9]{8}$/;

/**
 * Reads the spot part of an address: only one the reader can read (p3 or p3-5, S1-E4-11).
 *
 * @param part - the part after the chapter's code, if there is one
 * @returns null when there is no spot, the spot, or undefined when the part isn't a spot
 */
function spotOf(part: string | undefined): SpotRange | null | undefined {
  if (part === undefined) return null;
  return parseSpot(part) ?? undefined;
}

/**
 * Reads a shared address from a path.
 *
 * @param pathname - the request's path, for example "/s/statia-meteo/ab12cd34"
 * @returns the story and chapter, or null for any other path
 */
export function parseSharedAddress(pathname: string): SharedAddress | null {
  const parts = pathname.replace(/\/+$/, '').split('/');
  // parts[0] is the empty text before the first slash; parts[1] must be "s".
  if (parts[1] !== 's' || parts.length < 3 || parts.length > 5) return null;
  const storySlug = parts[2] ?? '';
  const chapterCode = parts[3] ?? null;
  if (!storySlugPattern.test(storySlug)) return null;
  if (chapterCode !== null && !chapterCodePattern.test(chapterCode)) return null;
  const spot = spotOf(parts[4]);
  if (spot === undefined) return null;
  return { storySlug, chapterCode, spot };
}

/** The JSON get_link_preview() answers. */
interface PreviewRow {
  slug: string;
  title: string;
  rating: LinkPreview['rating'];
  language_code: string;
  hides_text: boolean;
  is_listed: boolean;
  blurb: string | null;
  writer: { display_name: string; handle?: string | null } | null;
  cover: { kind: string; background: string | null } | null;
  category_slug: string | null;
  tags: string[] | null;
  chapter: { code: string; title: string | null } | null;
  // CALM-9s: the story footer's details (older databases leave them out).
  is_app_only?: boolean;
  is_hidden_somewhere?: boolean;
  genre?: string | null;
  first_published_at?: string | null;
  updated_at?: string | null;
  editions?: { slug: string; language_code: string }[] | null;
}

/**
 * Asks the database for an address's preview.
 *
 * @param settings - the Supabase address and public anon key
 * @param address - the story and chapter
 * @returns the preview, or null when the story or chapter has none; with a spot, the passage too
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchLinkPreview(
  settings: DatabaseSettings,
  address: SharedAddress,
): Promise<LinkPreview | null> {
  // Step 1: call the function through Supabase's REST endpoint, as a visitor (the anon key).
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/get_link_preview`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ story_slug: address.storySlug, chapter_code: address.chapterCode }),
  });
  if (!response.ok) throw new Error(`get_link_preview answered ${response.status}`);
  // Step 2: turn the database's names into ours.
  const row = (await response.json()) as PreviewRow | null;
  if (row === null) return null;
  // Step 3: the passage, for a spot in a story whose text visitors may see (S1-E4-11).
  const passage =
    address.spot === null || address.chapterCode === null || row.hides_text
      ? null
      : await fetchSharedPassage({
          ...settings,
          storySlug: address.storySlug,
          chapterCode: address.chapterCode,
          spot: address.spot,
          pictureWords: previewWords(row.language_code).picture,
        });
  // Step 4: a link to one picture that may be shared shows the picture itself (IDEAS-2f).
  const picture = await findSharedPicture(settings, address, row.hides_text);
  return { ...previewFromRow(row), isChapter: address.chapterCode !== null, passage, picture };
}

/**
 * Turns the database's names into ours, for the parts that come straight from the row.
 *
 * @param row - what get_link_preview() answered
 * @returns the preview without the address-dependent parts (chapter, passage, picture)
 */
function previewFromRow(row: PreviewRow): Omit<LinkPreview, 'isChapter' | 'passage' | 'picture'> {
  return {
    slug: row.slug,
    title: row.title,
    rating: row.rating,
    languageCode: row.language_code,
    hidesText: row.hides_text,
    isListed: row.is_listed,
    blurb: row.blurb,
    writerName: row.writer?.display_name ?? null,
    cover: row.cover,
    chapterTitle: row.chapter?.title ?? null,
    categorySlug: row.category_slug ?? null,
    tags: row.tags ?? [],
    ...searchDetailsFromRow(row),
  };
}

/**
 * The parts of the row search engines read (CALM-9s): where the story can be read, its genre,
 * the writer's profile, its dates and its other language editions. Older rows without them
 * read as a plain public story in one language.
 *
 * @param row - what get_link_preview() answered
 * @returns the search details of the preview
 */
function searchDetailsFromRow(row: PreviewRow) {
  return {
    isAppOnly: row.is_app_only ?? false,
    isHiddenSomewhere: row.is_hidden_somewhere ?? false,
    genre: row.genre ?? null,
    writerHandle: row.writer?.handle ?? null,
    firstPublishedAt: row.first_published_at ?? null,
    updatedAt: row.updated_at ?? null,
    editions: (row.editions ?? []).map((edition) => ({
      slug: edition.slug,
      languageCode: edition.language_code,
    })),
  };
}

/**
 * The picture a one-block spot link points to, when it may be shared.
 *
 * @param hidesText - true for 16+ and 18+ stories, whose text and pictures visitors can't see (Q6)
 * @returns its spot and alt text, or null for a story, a chapter, a longer passage or text
 * Errors: throws when the database answers with an error or can't be reached.
 */
async function findSharedPicture(
  settings: DatabaseSettings,
  address: SharedAddress,
  hidesText: boolean,
): Promise<LinkPreview['picture']> {
  if (hidesText || address.chapterCode === null || address.spot === null) return null;
  if (address.spot.first !== address.spot.last) return null;
  const spot: PicturePreviewAddress = {
    storySlug: address.storySlug,
    chapterCode: address.chapterCode,
    blockNumber: address.spot.first,
  };
  const picture = await fetchSharedPicture(settings, spot);
  return picture === null ? null : { address: spot, alt: picture.alt };
}

/**
 * Makes text safe inside HTML text and attribute values.
 *
 * @param text - any text, for example a story title
 * @returns the text with &, <, >, " and ' escaped
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The preview's wording in the story's language (Romanian unless the story is in English; the
 * interface opens in Romanian for everyone, decided 17 Oct 2026).
 *
 * @param languageCode - the story's language
 * @returns the reading namespace's linkPreview keys for that language
 */
function previewWords(languageCode: string) {
  return languageCode === 'en' ? englishReading.linkPreview : romanianReading.linkPreview;
}

/**
 * The category's name in the story's language, from the writing namespace's category labels.
 *
 * @param preview - the story's preview
 * @returns the name, for example "Poetry", or null when the story has no known category
 */
export function categoryName(preview: LinkPreview): string | null {
  if (preview.categorySlug === null) return null;
  const labels: Record<string, string> =
    preview.languageCode === 'en' ? englishWriting.categories : romanianWriting.categories;
  return labels[preview.categorySlug] ?? null;
}

/** The palette's colour names, one picture each in public/link-previews/. */
const previewColours: string[] = Object.keys(linkPreviewPalette);

/**
 * The colour of the story's preview picture: the writer's drawn cover's background, otherwise
 * plum (automatic covers).
 *
 * @param preview - the story's preview
 * @returns one of the palette's colour names
 */
export function previewColour(preview: LinkPreview): string {
  const background = preview.cover?.background ?? '';
  if (preview.cover?.kind === 'drawn' && previewColours.includes(background)) return background;
  return 'plum';
}

/**
 * The preview card's title and description: "by Pen name · Category · blurb", with "For mature
 * readers" after the pen name for 18+ only (never the rating itself; Robert, 11 Nov 2026).
 *
 * @param preview - the story's preview
 * @returns { title, description } as plain text
 */
export function previewText(preview: LinkPreview): { title: string; description: string } {
  const words = previewWords(preview.languageCode);
  // Step 1: a chapter shows "Story · Chapter"; a story page its title.
  const title =
    preview.chapterTitle === null ? preview.title : `${preview.title} · ${preview.chapterTitle}`;
  // Step 2: the short parts, each only when the story has it.
  const parts: string[] = [];
  if (preview.writerName !== null)
    parts.push(words.byWriter.replace('{{name}}', preview.writerName));
  // Robert, 11 Nov 2026: only 18+ says so; 16+ looks like every other story.
  if (preview.rating === '18_plus') parts.push(words.matureReaders);
  const category = categoryName(preview);
  if (category !== null) parts.push(category);
  // Step 3: a shared passage takes the blurb's place (S1-E4-11), in quotation marks.
  if (preview.passage !== null) parts.push(words.quoted.replace('{{passage}}', preview.passage));
  else if (preview.blurb !== null && preview.blurb !== '') parts.push(preview.blurb);
  return { title, description: parts.join(' · ') };
}

/**
 * The story statement's words in the story's language (CALM-9s): the reading namespace's
 * storyFooter keys, Romanian unless the story is in English, like the rest of the preview.
 *
 * @param languageCode - the story's language
 * @returns the words
 */
function statementWords(languageCode: string): StoryStatementWords {
  return languageCode === 'en' ? englishReading.storyFooter : romanianReading.storyFooter;
}

/**
 * The facts the story statement is made of (CALM-9s).
 *
 * @param preview - the story's preview
 * @returns the title, category, genre, writer, language and whether it is 18+
 */
export function statementFacts(preview: LinkPreview): StoryStatementFacts {
  return {
    title: preview.title,
    categorySlug: preview.categorySlug,
    genre: preview.genre,
    writerName: preview.writerName ?? '',
    languageCode: preview.languageCode,
    isMature: preview.rating === '18_plus',
  };
}

/**
 * Whether the page carries the story statement: a public story read on the web. An unlisted or
 * app-only story keeps the site's own footer words (CALM-9s); a story hidden in some countries
 * carries it, as its book page stays in search everywhere (COUNTRY-2, Robert, 27 Nov 2026).
 *
 * @param preview - the story's preview
 * @returns true when the statement may be shown and indexed
 */
export function carriesStatement(preview: LinkPreview): boolean {
  return preview.isListed && !preview.isAppOnly;
}

/**
 * The story page's description: the statement and the blurb, shortened to what search engines
 * show (CALM-9s). A chapter or a shared passage keeps the link preview's own description.
 *
 * @param preview - the story's preview
 * @param siteName - the product's name
 * @returns the description as plain text
 */
export function pageDescription(preview: LinkPreview, siteName: string): string {
  if (preview.isChapter || preview.passage !== null || !carriesStatement(preview)) {
    return previewText(preview).description;
  }
  const words = statementWords(preview.languageCode);
  return shortenForDescription(
    statementText(statementFacts(preview), words, siteName, preview.blurb ?? ''),
  );
}

/**
 * The page's <title>: "Title by pen name, genre, site" for a story page that carries the
 * statement (CALM-9s); the link preview's title otherwise.
 *
 * @param preview - the story's preview
 * @param siteName - the product's name
 * @returns the title
 */
export function pageTitle(preview: LinkPreview, siteName: string): string {
  if (preview.isChapter || !carriesStatement(preview)) return previewText(preview).title;
  const words = statementWords(preview.languageCode);
  return statementPageTitle(statementFacts(preview), words, siteName, categoryName(preview));
}

/**
 * The trail from Read to the story, as schema.org BreadcrumbList: Read, the category, the story.
 *
 * @param preview - the story's preview
 * @param page - the page's address and the site's origin
 * @returns the list as a plain object
 */
function breadcrumbData(preview: LinkPreview, page: { url: string; origin: string }) {
  const trail: { name: string; item: string }[] = [
    { name: statementWords(preview.languageCode).breadcrumbRead, item: `${page.origin}/discover` },
  ];
  const category = categoryName(preview);
  if (category !== null && preview.categorySlug !== null) {
    trail.push({ name: category, item: `${page.origin}/discover/c/${preview.categorySlug}` });
  }
  trail.push({ name: preview.title, item: page.url });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...step,
    })),
  };
}

/**
 * The schema.org description of a story page (CALM-9s): a Book for a story, a CreativeWork for a
 * poem or an essay, with its title, statement, writer and profile, genre, tags, language, dates,
 * that it is free, and the site as publisher; then the BreadcrumbList. Never its text, a real name
 * or an age (Q36, S1-E11-36).
 *
 * @param preview - the story's preview
 * @param page - the page's address, the site's name and origin
 * @returns two <script type="application/ld+json"> elements
 */
function structuredData(
  preview: LinkPreview,
  page: { url: string; siteName: string; origin: string },
): string {
  const work: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': storyTypeOf(preview.categorySlug) === 'story' ? 'Book' : 'CreativeWork',
    name: preview.title,
    inLanguage: preview.languageCode,
    url: page.url,
    description: pageDescription(preview, page.siteName),
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: page.siteName, url: page.origin },
  };
  if (preview.writerName !== null) {
    const author: Record<string, string> = { '@type': 'Person', name: preview.writerName };
    if (preview.writerHandle !== null) author.url = `${page.origin}/u/${preview.writerHandle}`;
    work.author = author;
  }
  const genre = preview.genre ?? categoryName(preview);
  if (genre !== null) work.genre = genre;
  if (preview.tags.length > 0) work.keywords = preview.tags.join(', ');
  if (preview.firstPublishedAt !== null) work.datePublished = preview.firstPublishedAt;
  if (preview.updatedAt !== null) work.dateModified = preview.updatedAt;
  return [work, breadcrumbData(preview, page)]
    .map((data) => {
      // "<" is written as \u003c so a title can never close the script element early.
      const json = JSON.stringify(data).replaceAll('<', '\\u003c');
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n    ');
}

/**
 * The hreflang links of a story in several languages: one per public edition (TRANSLATE-1;
 * CALM-9s), the first edition also as x-default.
 *
 * @param preview - the story's preview
 * @param origin - the site's origin
 * @returns the link tags, or an empty list for a story in one language
 */
function languageLinksFor(preview: LinkPreview, origin: string): string[] {
  if (preview.editions.length < 2) return [];
  const links = preview.editions.map(
    (edition) =>
      `<link rel="alternate" hreflang="${escapeHtml(edition.languageCode)}" href="${escapeHtml(`${origin}/s/${edition.slug}`)}">`,
  );
  // The first edition stands for every other language (x-default).
  const firstSlug = preview.editions[0]?.slug ?? preview.slug;
  links.push(
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}/s/${firstSlug}`)}">`,
  );
  return links;
}

/**
 * The preview's picture tags: the shared picture itself for a link to a picture that may be
 * shared (IDEAS-2f), otherwise the plain square in the cover's colour.
 *
 * @param preview - the story's preview
 * @param origin - the site's origin
 * @returns the og:image and twitter:card tags
 */
function imageTagsFor(preview: LinkPreview, origin: string): string[] {
  if (preview.picture !== null) {
    const image = picturePreviewUrl(origin, preview.picture.address);
    return [
      `<meta property="og:image" content="${escapeHtml(image)}">`,
      `<meta property="og:image:alt" content="${escapeHtml(preview.picture.alt)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
    ];
  }
  const image = `${origin}/link-previews/${previewColour(preview)}.png`;
  return [
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="${PREVIEW_IMAGE_SIDE}">`,
    `<meta property="og:image:height" content="${PREVIEW_IMAGE_SIDE}">`,
    `<meta name="twitter:card" content="summary">`,
  ];
}

/**
 * The keywords meta tag: the category and the tags, which search engines may use as hints.
 *
 * @param preview - the story's preview
 * @returns one tag in a list, or an empty list when the story has neither
 */
function keywordTagsFor(preview: LinkPreview): string[] {
  const category = categoryName(preview);
  const keywords = category === null ? preview.tags : [category, ...preview.tags];
  if (keywords.length === 0) return [];
  return [`<meta name="keywords" content="${escapeHtml(keywords.join(', '))}">`];
}

/**
 * Whether search engines may list the page: a public story's own page (Q36; S1-E11-36), read on
 * the web and shown in every country (CALM-9s), and a classic's chapters (GROWTH-2). A writer's
 * chapters stay out (GROWTH-4, Robert, 26 Nov 2026, 19:45 UTC): only the story's page, with its
 * details, is listed for them.
 *
 * @param preview - the story's preview
 * @returns true for such a story's page or a classic's chapter; false for a writer's chapter, a
 *   shared passage, a 16+ or 18+ chapter (visitors get no text), or an unlisted, app-only or
 *   country-hidden story
 */
export function isIndexable(preview: LinkPreview): boolean {
  // CALM-9s: an app-only story stays out too.
  if (!carriesStatement(preview)) return false;
  if (!preview.isChapter) return true;
  // COUNTRY-2: no chapter of a story hidden in any country is listed (Robert, 27 Nov 2026,
  // 22:06 UTC), so no hidden text reaches search engines; the book page above stays in.
  if (preview.isHiddenSomewhere) return false;
  // GROWTH-4: only a classic's chapters are listed. get_link_preview() gives a classic no
  // writer's username (its author has no profile), so a missing username marks a classic; when
  // in doubt the chapter stays out.
  if (preview.writerHandle !== null) return false;
  // GROWTH-2: a chapter is listed only on its own address (a shared passage repeats it) and only
  // when visitors get its text; sitemap_entries() lists the same chapters.
  return preview.passage === null && !preview.hidesText;
}

/**
 * Everything the preview adds to the page's <head>.
 *
 * @param preview - the story's preview
 * @param page - the page's address, the site's name and the site's origin
 * @returns the tags as one HTML text
 */
export function headTagsFor(
  preview: LinkPreview,
  page: { url: string; siteName: string; origin: string },
): string {
  const { title } = previewText(preview);
  const description = pageDescription(preview, page.siteName);
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    ...keywordTagsFor(preview),
    `<link rel="canonical" href="${escapeHtml(page.url)}">`,
    `<meta property="og:type" content="${preview.isChapter ? 'article' : 'book'}">`,
    `<meta property="og:site_name" content="${escapeHtml(page.siteName)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(page.url)}">`,
    ...imageTagsFor(preview, page.origin),
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  // An unlisted story is shared by its link only, so it is noindex (S1-E11-36).
  // CALM-9s: an app-only story is noindex as well, with no structured data; a country-hidden
  // story's chapters too, while its book page keeps both (COUNTRY-2).
  // GROWTH-2: a classic's chapter is indexable (GROWTH-4: a writer's is not), but the language links and the
  // structured data describe the story, so only the story's own page carries them.
  if (!isIndexable(preview)) tags.push('<meta name="robots" content="noindex">');
  else if (!preview.isChapter) {
    tags.push(...languageLinksFor(preview, page.origin), structuredData(preview, page));
  }
  return tags.join('\n    ');
}

/**
 * Puts a title and tags into a page.
 *
 * @param html - the app's index.html
 * @param title - the new <title> text, or null to keep the page's own
 * @param tags - HTML to add at the end of <head>
 * @returns the changed page
 */
export function injectIntoHead(html: string, title: string | null, tags: string): string {
  const withTitle =
    title === null
      ? html
      : html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  return withTitle.replace('</head>', `    ${tags}\n  </head>`);
}

/**
 * The story statement as visible HTML for the page before the app starts (CALM-9s): the sentence
 * with the title in <cite>, "For mature readers." for 18+, the blurb and the site's line, in a
 * <footer> inside the app's root. Search engines and answer engines that don't run JavaScript read
 * the same words the footer shows; the app replaces it when it starts, with the same words. It is
 * never hidden text.
 *
 * @param preview - the story's preview
 * @param siteName - the product's name
 * @returns the HTML, or an empty text when the page keeps the site's own footer words
 */
export function visibleStatementFor(preview: LinkPreview, siteName: string): string {
  if (!carriesStatement(preview)) return '';
  const words = statementWords(preview.languageCode);
  // Step 1: the sentence, with the title as a <cite> and the writer as a profile link.
  const sentence = statementSentence(statementFacts(preview), words, siteName)
    .map((piece) => {
      if (piece.kind === 'title') return `<cite>${escapeHtml(piece.text)}</cite>`;
      if (piece.kind === 'writer' && preview.writerHandle !== null) {
        return `<a href="/u/${escapeHtml(preview.writerHandle)}">${escapeHtml(piece.text)}</a>`;
      }
      return escapeHtml(piece.text);
    })
    .join('');
  // Step 2: the paragraphs, each only when there is something to say.
  const paragraphs = [sentence];
  if (preview.rating === '18_plus') paragraphs.push(escapeHtml(`${words.matureReaders}.`));
  if (preview.blurb !== null && preview.blurb.trim() !== '')
    paragraphs.push(escapeHtml(preview.blurb));
  paragraphs.push(escapeHtml(statementSiteLine(words, siteName)));
  const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
  return `<footer lang="${escapeHtml(preview.languageCode)}">${body}</footer>`;
}

/**
 * Puts HTML inside the app's root element, where it shows until the app starts.
 *
 * @param html - the app's index.html
 * @param content - the HTML to show, or an empty text to leave the page as it is
 * @returns the changed page
 */
export function injectIntoRoot(html: string, content: string): string {
  if (content === '') return html;
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}

/**
 * The site's name: the <title> index.html is built with (from src/config/brand.ts), so the
 * product name is never written here (CLAUDE.md: names are settings, not code).
 *
 * @param html - the app's index.html
 * @returns the text of its <title>, or an empty text
 */
export function siteNameOf(html: string): string {
  return /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() ?? '';
}

/**
 * Answers a request for a shared address with the app's page and its preview.
 *
 * @param request - the incoming GET request for /s/…
 * @param host - how to read index.html and the preview
 * @returns the page, with the preview tags when there is a preview, noindex when it is a chapter
 *   or unknown, and unchanged when the database can't be reached
 */
export async function handleSharedLink(request: Request, host: SharedLinkHost): Promise<Response> {
  // Step 1: the page itself; anything but a shared address goes out as it is.
  const page = await host.fetchIndexHtml();
  const url = new URL(request.url);
  const address = parseSharedAddress(url.pathname);
  if (address === null || !page.ok) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // The page's text changes, so the static file's length and version tag no longer apply.
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Step 2: the preview; when the database can't be reached, the page still loads, unchanged.
  let preview: LinkPreview | null;
  try {
    preview = await host.findPreview(address);
  } catch {
    console.warn(
      'Link preview: the database could not be reached; the page went out without tags.',
    );
    return new Response(html, { status: page.status, headers });
  }
  // Step 3: an unknown or hidden address: no preview, and not indexable.
  if (preview === null) {
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
      status: page.status,
      headers,
    });
  }
  // Step 4: the tags; the page's address carries no query (no tracking codes, S1-E4-05).
  const pageUrl = `${url.origin}${url.pathname}`;
  const tags = headTagsFor(preview, {
    url: pageUrl,
    siteName: siteNameOf(html),
    origin: url.origin,
  });
  if (!isIndexable(preview)) headers.set('X-Robots-Tag', 'noindex');
  // Step 5: the title and, for a story that carries it, the visible statement (CALM-9s).
  const siteName = siteNameOf(html);
  const withHead = injectIntoHead(html, pageTitle(preview, siteName), tags);
  return new Response(injectIntoRoot(withHead, visibleStatementFor(preview, siteName)), {
    status: page.status,
    headers,
  });
}
