/**
 * Addresses inside the forums (bundle FORUMS-1, part c; story S1-E8-03).
 *
 * Who calls it: ForumPostCard (each post's permalink and its quotes' links) and ReplyForm (the
 * quotes about to be sent). One place builds a post's permalink, so every link to a post is the
 * same address the thread page knows how to open (?post=7 scrolls to #7, S1-E8-02 criterion 3).
 * GAPS-9: ThreadNextControl reads a thread's number from what a moderator types or pastes.
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

/**
 * The thread number in what a moderator typed: a bare number ("412") or a thread's address
 * pasted from the browser (".../forums/first-chapters/412?post=3").
 *
 * @param text - what was typed or pasted
 * @returns the thread's number, or null when the text is neither
 */
export function threadNumberFrom(text: string): number | null {
  // Step 1: a bare number, or an address ending /forums/<forum>/<number> with an optional ?… or #….
  const match = /^(?:\S*\/forums\/[a-z0-9-]+\/)?(\d{1,15})(?:[?#]\S*)?$/.exec(text.trim());
  if (match === null) return null;
  // Step 2: thread numbers start at 1.
  const number = Number(match[1]);
  return number >= 1 ? number : null;
}
