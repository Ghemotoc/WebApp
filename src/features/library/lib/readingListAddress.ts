/**
 * The address of a reading list's own page (bundle GAPS-6): /library/lists/<the list's ID>.
 *
 * In one place so the Library's rows, a new list and the story page's "Add to a list" all lead
 * to the same page, and the database's notification address (notification_item_json()) has one
 * front-end twin. The ID is the list's own, never a person's (CLAUDE.md rule 15).
 * Who uses it: ReadingListsCard, ReadingListPage and AddToReadingList.
 */

/** A row ID as the database writes it. */
const rowIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The page of one reading list.
 *
 * @param listId - the list's ID
 * @returns the address
 */
export function readingListAddress(listId: string): string {
  return `/library/lists/${encodeURIComponent(listId)}`;
}

/**
 * Whether the address's last part can be a list's ID at all, so a mistyped address says "no such
 * list" without asking the database (which would refuse a text that isn't an ID with an error).
 *
 * @param value - the :listId part of the address
 * @returns true for a well-formed ID
 */
export function isReadingListId(value: string | undefined): value is string {
  return value !== undefined && rowIdPattern.test(value);
}
