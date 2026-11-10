/**
 * Which help pages are the how-to guides, and which of them a page of the hub's guide row shows
 * (bundle G9 WRITING, part a; Robert, 9 Nov 2026, 12:11 UTC: step-by-step guides about using the
 * platform, written as CMS help pages).
 *
 * The guides are ordinary CMS help pages whose address starts with "how-to-" (migration
 * g9a_writers_hub seeds fifteen), so staff add, edit or remove one from Staff › Website and the
 * hub and the Resources page follow without a release. The rights page is "writers-rights".
 * Who calls it: HubGuides and ResourcesPage. What it calls: nothing.
 */

/** The start of every how-to guide's address (/help/how-to-…). */
export const howToKeyPrefix = 'how-to-';

/** The address of the writers' rights page, /help/writers-rights. */
export const writersRightsKey = 'writers-rights';

/** How many guides the hub's row shows at a time (the board's two). */
export const guidesPerPage = 2;

/**
 * Keeps only the how-to guides, in the order the CMS gives them.
 *
 * @param pages - help pages with their address
 * @returns the guides
 */
export function howToGuides<Page extends { entryKey: string }>(pages: Page[]): Page[] {
  return pages.filter((page) => page.entryKey.startsWith(howToKeyPrefix));
}

/**
 * Says how many pages of guides the row has.
 *
 * @param guideCount - how many guides there are
 * @returns at least 1, so an empty row still has a first page
 */
export function guidePageCount(guideCount: number): number {
  return Math.max(1, Math.ceil(guideCount / guidesPerPage));
}

/**
 * Picks the guides one page of the row shows.
 *
 * @param guides - every guide
 * @param pageIndex - the page, from 0; kept inside the row when it is too high or too low
 * @returns the guides on that page and the page actually shown
 */
export function guidesOnPage<Guide>(
  guides: Guide[],
  pageIndex: number,
): { shown: Guide[]; pageIndex: number } {
  const lastPage = guidePageCount(guides.length) - 1;
  const safeIndex = Math.min(Math.max(pageIndex, 0), lastPage);
  const start = safeIndex * guidesPerPage;
  return { shown: guides.slice(start, start + guidesPerPage), pageIndex: safeIndex };
}
