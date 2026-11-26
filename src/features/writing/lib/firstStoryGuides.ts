/**
 * Which help pages "Guides for a first story" lists on an empty Write page (board D04, user story
 * 5.4: "guides open in Writers' hub"), and the words of each row.
 *
 * The guides are ordinary CMS help pages, so staff add, edit, reorder or remove one from Staff ›
 * Website › Help without a release (Robert, 25 Nov 2026: every widget editable from the back
 * end). A page whose address starts with "first-story-" is a first-story guide (migration
 * books_d04_first_story_guides seeds the board's three); website_content() lists pages by address,
 * so the number after the prefix sets the order ("first-story-1-…", "first-story-2-…"). Each row's
 * kind is the page's section ("Guide", "Rights"), its minutes come from the page's length, and its
 * line is the page's search description, the one-line summary staff already write for search and
 * sharing.
 * Who calls it: FirstStoryGuides. What it calls: the hub's reading-time helper.
 */
import { guideReadingMinutes } from '@/features/hub/lib/howToGuides';
import type { HelpPageContent } from '@/schemas/websiteContent';

/** The start of every first-story guide's address (/help/first-story-…). */
export const firstStoryKeyPrefix = 'first-story-';

/** One help page as the CMS hook gives it. */
interface HelpPageEntry {
  entryKey: string;
  languageCode: string;
  content: HelpPageContent;
}

/** One row of the list. */
export interface FirstStoryGuide {
  key: string;
  title: string;
  /** The page's section, said as its kind ("Guide", "Rights"). */
  kind: string;
  minutes: number;
  /** The one line under the title; empty when staff left the search description blank. */
  line: string;
  href: string;
  /** The language the page is written in, for screen readers when it differs from the page's. */
  languageCode: string;
}

/**
 * Picks the guides and writes each row.
 *
 * @param pages - the live help pages for this visitor, in the CMS's order (by address)
 * @returns the first-story guides, in that order
 */
export function firstStoryGuides(pages: HelpPageEntry[]): FirstStoryGuide[] {
  // Step 1: only the first-story guides, in the order their addresses give.
  const guides = pages.filter((page) => page.entryKey.startsWith(firstStoryKeyPrefix));
  // Step 2: the words the row shows; a page hidden from search still lists, it only isn't indexed.
  return guides.map((page) => ({
    key: page.entryKey,
    title: page.content.title,
    kind: page.content.section,
    minutes: guideReadingMinutes(page.content.body),
    line: page.content.search?.description ?? '',
    href: `/help/${page.entryKey}`,
    languageCode: page.languageCode,
  }));
}
