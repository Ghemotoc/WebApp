/**
 * One public page as Staff › Website › Search and sharing shows it: what search results and share
 * cards will say, and what is missing (story S1-E11-39; bundle SEO-1d).
 *
 * Why it exists: the screen must show exactly what the real tags say, so it builds each page's
 * words with the same functions the Cloudflare handlers use (src/lib/searchWords.ts) and only
 * adds what the screen needs on top: the share picture, the pictures without alt text and the
 * main heading.
 * - The home page and help pages share the site's large share picture, whose alt text is the
 *   site's name (server/website-head.ts), and show one main heading: the headline or the title.
 * - A landing page's card is its theme's colour card, whose alt text is the page's title
 *   (server/landing-preview.ts); its own pictures need alt text in both languages, and its one
 *   main heading is the hero's title.
 * Who calls it: api/staff/searchPages.ts, for each row admin_search_pages() answers.
 * What it calls: src/lib/searchWords.ts and the link preview colours (server/link-preview-palette.ts).
 */
import {
  landingBlocksOf,
  landingPageWords,
  searchWarnings,
  textOf,
  websitePageWords,
  type PageSearchWords,
  type SearchWarning,
} from '@/lib/searchWords';

import { linkPreviewPalette } from '../../../../server/link-preview-palette';

/** The kinds of page the screen lists. */
export type SearchPageKind = 'home_page' | 'help_page' | 'landing_page';

/** One row as admin_search_pages() answers it. */
export interface SearchPageRow {
  page_kind: string;
  market_code: string | null;
  language_code: string;
  address: string;
  content: unknown;
}

/** One page on the screen. */
export interface SearchPageReport {
  kind: SearchPageKind;
  /** The market, for the home page and help pages; null for a landing page. */
  marketCode: string | null;
  language: string;
  /** The page's address on the site, for example "/help/how-to-report-something". */
  address: string;
  words: PageSearchWords;
  /**
   * The <title> search results show, before the site's name: the server's own rule
   * (server/website-head.ts, server/landing-preview.ts). The home page shows the site's name
   * alone unless staff gave it a search title; a landing page's title has no site name after it.
   */
  resultTitle: { lead: string; withSiteName: boolean };
  /** The share card's picture, as a path on the site. */
  sharePicture: string;
  warnings: SearchWarning[];
}

/** The site's large share picture (server/website-head.ts, S1-E11-38). */
const SITE_SHARE_PICTURE = '/link-previews/share.png';

/** The colours public/link-previews/ has a card for, the same list the landing handler reads. */
const landingCardColours = Object.keys(linkPreviewPalette);

/** A landing page's content, as far as the report reads it. */
interface LandingContent {
  theme?: unknown;
  blocks?: unknown;
  search?: { hidden?: unknown; ro?: unknown };
}

/**
 * Reads stored content as an object; anything else counts as empty.
 *
 * @param content - the live version's content
 * @returns the content as an object
 */
function objectOf(content: unknown): Record<string, unknown> {
  return typeof content === 'object' && content !== null
    ? (content as Record<string, unknown>)
    : {};
}

/**
 * True when a stored text is missing or blank.
 *
 * @param value - the stored value
 * @returns whether it holds no words
 */
function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * The report for the home page or a help page.
 *
 * @param kind - which of the two it is
 * @param content - the live version's content
 * @returns the words, the picture and the warnings
 */
function websiteReport(
  kind: 'home_page' | 'help_page',
  content: Record<string, unknown>,
): Pick<SearchPageReport, 'words' | 'resultTitle' | 'sharePicture' | 'warnings'> {
  const words = websitePageWords(kind, content);
  // The home page's tab keeps the site's name alone unless staff wrote a search title.
  const searchFields = objectOf(content.search);
  const lead = kind === 'home_page' ? textOf(searchFields.title) : words.title;
  // The main heading is the page's own title, whatever staff wrote for search engines.
  const ownTitle = websitePageWords(kind, { ...content, search: undefined }).title;
  const warnings = searchWarnings({
    words,
    hasSharePicture: true,
    picturesWithoutAlt: 0,
    mainHeadings: ownTitle === '' ? 0 : 1,
  });
  return {
    words,
    resultTitle: { lead, withSiteName: true },
    sharePicture: SITE_SHARE_PICTURE,
    warnings,
  };
}

/**
 * The report for a landing page.
 *
 * @param content - the live version's content
 * @returns the words, the picture and the warnings
 */
function landingReport(
  content: LandingContent,
): Pick<SearchPageReport, 'words' | 'resultTitle' | 'sharePicture' | 'warnings'> {
  // Only blocks that are objects count; anything else in stored content is skipped.
  const blocks = landingBlocksOf(content.blocks);
  const words = landingPageWords(content);
  // Step 1: the page's own pictures need alt text in both languages.
  const picturesWithoutAlt = blocks.filter(
    (block) => !isBlank(block.picture_id) && (isBlank(block.ro?.alt) || isBlank(block.en?.alt)),
  ).length;
  // Step 2: the one main heading is the hero's title (LandingPageView).
  const heroTitle = landingPageWords({ blocks }).title;
  const theme = typeof content.theme === 'string' ? content.theme : '';
  const colour = landingCardColours.includes(theme) ? theme : 'plum';
  const warnings = searchWarnings({
    words,
    hasSharePicture: true,
    picturesWithoutAlt,
    mainHeadings: heroTitle === '' ? 0 : 1,
  });
  return {
    words,
    resultTitle: { lead: words.title, withSiteName: false },
    sharePicture: `/link-previews/${colour}.png`,
    warnings,
  };
}

/**
 * Turns one row of admin_search_pages() into the page the screen shows.
 *
 * @param row - the row as the database answered it
 * @returns the page, or null for a kind the screen doesn't know
 */
export function searchPageReportOf(row: SearchPageRow): SearchPageReport | null {
  const place = {
    marketCode: row.market_code,
    language: row.language_code,
    address: row.address,
  };
  if (row.page_kind === 'home_page' || row.page_kind === 'help_page') {
    return {
      kind: row.page_kind,
      ...place,
      ...websiteReport(row.page_kind, objectOf(row.content)),
    };
  }
  if (row.page_kind === 'landing_page') {
    return { kind: 'landing_page', ...place, ...landingReport(objectOf(row.content)) };
  }
  return null;
}
