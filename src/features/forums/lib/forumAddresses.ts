/**
 * Addresses inside the forums (bundle FORUMS-1, part c; story S1-E8-03).
 *
 * Who calls it: ForumPostCard (each post's permalink and its quotes' links) and ReplyForm (the
 * quotes about to be sent). One place builds a post's permalink, so every link to a post is the
 * same address the thread page knows how to open (?post=7 scrolls to #7, S1-E8-02 criterion 3).
 */

/**
 * The address of one post in a thread.
 *
 * @param forumSlug - the forum's address
 * @param threadNumber - the thread's number
 * @param postNumber - the post's number in the thread
 * @returns the thread's address with ?post= for that post
 */
export function postAddress(forumSlug: string, threadNumber: number, postNumber: number): string {
  return `/forums/${forumSlug}/${threadNumber}?post=${postNumber}`;
}
