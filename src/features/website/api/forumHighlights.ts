/**
 * Reads the home page's forums band: the busiest threads this week in the platform's own forums
 * and a few public spaces (bundle LOOK-3; board Website-Home, "Community").
 *
 * Who calls it: hooks/useForumHighlights.ts.
 * What it calls next: public_forum_highlights() in …_look3_01_home_bands_and_forums.sql, which
 * never lists anything inside a space (so never a class, private or under-16 space), only shows
 * people who may be put on show and leaves out anyone across a block. No user ID comes back.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One busy thread. */
export interface HighlightedThread {
  forumSlug: string;
  forumName: string;
  number: number;
  title: string;
  starterHandle: string;
  starterName: string;
  replyCount: number;
}

/** One public space. */
export interface HighlightedSpace {
  slug: string;
  name: string;
}

/** The band's two lists. */
export interface ForumHighlights {
  threads: HighlightedThread[];
  spaces: HighlightedSpace[];
}

/** The function's JSON. */
interface ForumHighlightsRow {
  threads: {
    forum_slug: string;
    forum_name: string | null;
    number: number;
    title: string;
    starter: { handle: string; display_name: string } | null;
    reply_count: number;
  }[];
  spaces: HighlightedSpace[];
}

/**
 * Reads the highlights.
 *
 * @param client - the shared Supabase client (signed out is fine)
 * @param language - the page's language, for the forums' names
 * @returns the threads and spaces; both may be empty
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchForumHighlights(
  client: AppSupabaseClient,
  language: string,
): Promise<ForumHighlights> {
  // Step 1: ask the database; it applies every rule for this reader.
  const { data, error } = await client.rpc('public_forum_highlights', {
    wanted_language: language,
  });
  if (error !== null) throw new Error(`Could not read the forums: ${error.message}`);
  const row = data as unknown as ForumHighlightsRow;
  // Step 2: the screen's shape. A thread whose starter has gone is left out.
  const threads = row.threads.flatMap((thread) => {
    if (thread.starter === null) return [];
    return [
      {
        forumSlug: thread.forum_slug,
        forumName: thread.forum_name ?? '',
        number: thread.number,
        title: thread.title,
        starterHandle: thread.starter.handle,
        starterName: thread.starter.display_name,
        replyCount: thread.reply_count,
      },
    ];
  });
  return { threads, spaces: row.spaces };
}
