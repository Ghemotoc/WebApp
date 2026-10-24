/**
 * useCopiedWorkNote: whether a story carries the public note "Moderators found that parts of this
 * story copy a published work" (story S1-E10-08).
 *
 * Who calls it: CopiedWorkNote on the story page. What it calls: story_has_copied_work_note(),
 * open to everyone because the note is public; it says nothing else about the case.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

/**
 * Reads the note's presence.
 *
 * @param storyId - the story's ID (never shown; the page already has it)
 * @returns hasNote: true only once the database says so
 * Errors: a failed read shows no note, the safe side for the writer; the error stays in the query.
 */
export function useCopiedWorkNote(storyId: string) {
  const note = useQuery({
    queryKey: ['copied-work-note', storyId],
    enabled: storyId !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      const { data, error } = await client.rpc('story_has_copied_work_note', {
        target_story_id: storyId,
      });
      if (error !== null) throw new Error(`Could not read the story's note: ${error.message}`);
      return data;
    },
  });
  return { hasNote: note.data === true };
}
