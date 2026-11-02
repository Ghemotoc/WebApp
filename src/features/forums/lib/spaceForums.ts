/**
 * Space forums' addresses (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * Every space owns one hidden forum whose address is "space-" plus the space's own, so its
 * threads reuse the forum machinery at /forums/space-<name>/<n>. The forum itself has no page:
 * its address moves to the space's page. Who calls it: ForumPage and NewThreadPage.
 */

/** What starts the address of every space's forum (forums_space_slug in the database). */
const spaceForumPrefix = 'space-';

/**
 * The space a forum address belongs to.
 *
 * @param forumSlug - a forum's address
 * @returns the space's address, or null for a forum in the main forums
 */
export function spaceSlugOfForum(forumSlug: string): string | null {
  if (!forumSlug.startsWith(spaceForumPrefix)) return null;
  return forumSlug.slice(spaceForumPrefix.length);
}
