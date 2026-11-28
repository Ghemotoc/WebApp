/**
 * usePlayCast: the story's cast in the play editor (LAYOUTS-2; board D14, the "Characters" panel
 * and the names suggested under a speech).
 *
 * The cast belongs to the whole story, so it is read by the story's address and kept in the
 * query cache for every chapter of it. A change shows at once and is saved in the background
 * (set_story_cast()); if the save is refused or fails, the list goes back and the panel says why,
 * so the writer never believes readers will see a list they won't.
 * It also hands the names to the editor's play mode (the suggestions and "Add “M…” to the cast").
 * Who calls it: ChapterEditorPage (useLoadedEditor). What it calls: api/playCast.ts.
 */
import type { Editor } from '@tiptap/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { MAXIMUM_CAST_SIZE, type CastMember } from '@/schemas/playCast';

import { fetchStoryCast, saveStoryCast, type SaveCastOutcome } from '../api/playCast';

/** The cache key of a story's cast. */
export const storyCastKey = (userId: string | null, storySlug: string) => [
  'story-cast',
  userId,
  storySlug,
];

/** What the panel and the editor get. */
export interface PlayCastState {
  cast: CastMember[];
  /** Replaces the whole list (add, change, remove and reorder all come through here). */
  save: (next: CastMember[]) => void;
  /** Adds a name typed in a speech, if it isn't in the cast yet. */
  addName: (name: string) => void;
  isSaving: boolean;
  /** Why the last change wasn't saved: a refused shape, or 'failed' when it couldn't be sent. */
  problem: Exclude<SaveCastOutcome, 'ok'> | 'failed' | null;
}

/**
 * Reads and changes the story's cast.
 *
 * @param storySlug - the story's address
 * @param editor - the chapter editor, which learns the names for its suggestions
 * @returns the cast, save(next), addName(name), isSaving and problem
 */
export function usePlayCast(storySlug: string, editor: Editor | null): PlayCastState {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const key = storyCastKey(userId, storySlug);
  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => fetchStoryCast(await requireClient(), storySlug),
  });
  const cast = query.data ?? [];
  const saving = useMutation({
    mutationFn: async (next: CastMember[]) => {
      const outcome = await saveStoryCast(await requireClient(), storySlug, next);
      if (outcome !== 'ok') throw new CastRefused(outcome);
    },
  });

  /** A change: shown at once, saved after; put back if the save doesn't go through. */
  function save(next: CastMember[]) {
    const before = cast;
    queryClient.setQueryData(key, next);
    saving.mutate(next, { onError: () => queryClient.setQueryData(key, before) });
  }

  /** "Add “M…” to the cast": a new name at the end, with no note yet. */
  function addName(name: string) {
    const trimmed = name.trim();
    const isKnown = cast.some((member) => member.name.toLowerCase() === trimmed.toLowerCase());
    if (trimmed === '' || isKnown || cast.length >= MAXIMUM_CAST_SIZE) return;
    save([...cast, { name: trimmed, note: '' }]);
  }

  // The editor's play mode suggests these names and adds new ones through addName.
  useEffect(() => {
    if (editor === null) return;
    editor.storage.playMode.castNames = cast.map((member) => member.name);
    editor.storage.playMode.addToCast = addName;
  });

  return { cast, save, addName, isSaving: saving.isPending, problem: problemOf(saving.error) };
}

/** A save the database refused, with its reason. */
class CastRefused extends Error {
  constructor(readonly outcome: Exclude<SaveCastOutcome, 'ok'>) {
    super(`The characters were not saved: ${outcome}`);
  }
}

/** The panel's reason for the last failed save, or null. */
function problemOf(error: Error | null): PlayCastState['problem'] {
  if (error === null) return null;
  return error instanceof CastRefused ? error.outcome : 'failed';
}
