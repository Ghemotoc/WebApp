/**
 * Which help pages are the how-to guides, and how long each takes to read (bundle G9 WRITING, part a; Robert, 9 Nov 2026, 12:11 UTC: step-by-step guides about using the
 * platform, written as CMS help pages).
 *
 * The guides are ordinary CMS help pages whose address starts with "how-to-" (migration
 * g9a_writers_hub seeds fifteen), so staff add, edit or remove one from Staff › Website and the
 * hub and the Resources page follow without a release. The rights page is "writers-rights".
 * Who calls it: HubToolsGuides, HubGuideRows and ResourcesPage. What it calls: nothing.
 */

/** The start of every how-to guide's address (/help/how-to-…). */
export const howToKeyPrefix = 'how-to-';

/** The address of the writers' rights page, /help/writers-rights. */
export const writersRightsKey = 'writers-rights';

/**
 * Keeps only the how-to guides, in the order the CMS gives them.
 *
 * @param pages - help pages with their address
 * @returns the guides
 */
export function howToGuides<Page extends { entryKey: string }>(pages: Page[]): Page[] {
  return pages.filter((page) => page.entryKey.startsWith(howToKeyPrefix));
}

/** Words a reader gets through in a minute, for "6 min read" (a common reading pace). */
const wordsPerMinute = 200;

/**
 * How long a guide takes to read, in whole minutes and never less than one.
 *
 * @param body - the guide's text
 * @returns the minutes
 */
export function guideReadingMinutes(body: string): number {
  const words = body.split(/\s+/).filter((word) => word !== '').length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
