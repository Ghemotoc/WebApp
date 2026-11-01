/**
 * Puts the forum index in order and finds one forum in it (bundle FORUMS-1, part a; story
 * S1-E8-01; Q45, 16 Oct 2026: "Forums sort by latest activity, with the starting categories
 * pinned").
 *
 * Who calls it: ForumsPage (the whole tree) and ForumPage (one forum, its breadcrumb and the
 * forums inside it). It calls nothing: plain functions over the rows api/forumIndex.ts read.
 */
import type { ForumEntry } from '../api/forumIndex';

/** A forum with the subforums inside it. */
export interface ForumWithSubforums {
  forum: ForumEntry;
  subforums: ForumEntry[];
}

/** A category with its forums. */
export interface ForumCategory {
  category: ForumEntry;
  forums: ForumWithSubforums[];
}

/**
 * Staff's order among siblings: by position, then by address so the order never jumps.
 *
 * @returns a negative number when first comes before second
 */
function byPosition(first: ForumEntry, second: ForumEntry): number {
  if (first.position !== second.position) return first.position - second.position;
  return first.slug.localeCompare(second.slug);
}

/**
 * The order of categories: pinned ones first, in staff's order; then the rest, the one with the
 * latest post first and those with none last (Q45).
 *
 * @returns a negative number when first comes before second
 */
export function byCategoryOrder(first: ForumEntry, second: ForumEntry): number {
  // Step 1: pinned before not pinned; two pinned ones keep staff's order.
  if (first.isPinned !== second.isPinned) return first.isPinned ? -1 : 1;
  if (first.isPinned) return byPosition(first, second);
  // Step 2: among the rest, the latest activity first; ISO dates compare as text.
  const firstActivity = first.latestActivityAt ?? '';
  const secondActivity = second.latestActivityAt ?? '';
  if (firstActivity !== secondActivity) return secondActivity.localeCompare(firstActivity);
  return byPosition(first, second);
}

/**
 * The live entries inside one category or forum, in staff's order.
 *
 * @param entries - every entry from the index
 * @param parentId - the category or forum
 * @returns its children
 */
export function childrenOf(entries: ForumEntry[], parentId: string): ForumEntry[] {
  return entries.filter((entry) => entry.parentId === parentId).sort(byPosition);
}

/**
 * Builds the index: categories in order, each with its forums and their subforums.
 *
 * @param entries - every entry from forum_index()
 * @returns the categories, in the order the index shows them
 */
export function buildForumTree(entries: ForumEntry[]): ForumCategory[] {
  const categories = entries.filter((entry) => entry.level === 0).sort(byCategoryOrder);
  return categories.map((category) => ({
    category,
    forums: childrenOf(entries, category.id).map((forum) => ({
      forum,
      subforums: childrenOf(entries, forum.id),
    })),
  }));
}

/**
 * The way down to one forum: its category, its forum (for a subforum) and itself, for the
 * breadcrumb.
 *
 * @param entries - every entry from the index
 * @param slug - the forum's address
 * @returns the entries from the category down to the forum, or an empty list when there is none
 */
export function forumPath(entries: ForumEntry[], slug: string): ForumEntry[] {
  const path: ForumEntry[] = [];
  let current = entries.find((entry) => entry.slug === slug);
  // Walk up to the category; three levels at most, so the loop is short.
  while (current !== undefined) {
    path.unshift(current);
    const parentId = current.parentId;
    current = parentId === null ? undefined : entries.find((entry) => entry.id === parentId);
  }
  return path;
}
