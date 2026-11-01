/**
 * How the forums name a person (bundle FORUMS-1, part b; S1-E8-02).
 *
 * Who calls it: ThreadRow, ThreadHeader and ForumPostCard. A deleted account has no name left, so
 * it shows as "Deleted account"; a user ID is never shown (architecture 1.6).
 */
import type { ForumPerson } from '../api/forumThreads';

/**
 * A person's name, or the words for a deleted account.
 *
 * @param person - the person, or null for a deleted account
 * @param deletedName - "Deleted account" in the reader's language
 * @returns the name to show
 */
export function nameOf(person: ForumPerson, deletedName: string): string {
  return person === null ? deletedName : person.displayName;
}
