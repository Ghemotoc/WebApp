/**
 * useArrivingCover: notices a cover saved from another tab, such as a cover made in Canva, and
 * puts it in the open Story settings form (bundle IDEAS-2, part d; idea IDEA-20261101-11).
 *
 * "Design it in Canva" opens a new tab, and the cover comes back and is saved in that tab
 * (CanvaReturnPage → saveCanvaCover()). The settings tab used to keep showing the old cover, so
 * writers tried again or thought it had failed. The writer's story list is read again whenever
 * the tab gets focus (TanStack Query's refetch on focus, useMyStories), so the saved cover path
 * changes under the form; this hook sees that change, puts the new cover in the form and says so.
 * The new cover is already saved, so taking it never loses anything: it is the writer's latest
 * choice, and saving the form keeps it.
 * Who calls it: useStorySettingsForm. What it calls: the cover picture's cache, so the preview
 * shows the new picture and its check ("Waiting for a check") at once.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { StoryCoverChoice } from '@/schemas/story';

import type { MyStory } from '../api/stories';

/**
 * Whether the form already holds this uploaded cover.
 *
 * @returns true when the form's cover is the upload at that path
 */
function formHolds(cover: StoryCoverChoice, path: string): boolean {
  return cover.kind === 'upload' && cover.tallPath === path;
}

/**
 * Follows the story's saved cover while the settings form is open.
 *
 * @param story - the story as last read from the database
 * @param cover - the form's current cover answer
 * @param setCover - changes the form's cover answer
 * @returns the path of a cover that arrived from another tab since the form opened, or null
 */
export function useArrivingCover(
  story: Pick<MyStory, 'slug' | 'coverTallPath'>,
  cover: StoryCoverChoice,
  setCover: (cover: StoryCoverChoice) => void,
): string | null {
  const queryClient = useQueryClient();
  const savedPath = story.coverTallPath;
  // The saved path the form last knew about; it starts as the one it opened with.
  const [knownPath, setKnownPath] = useState(savedPath);
  const [arrivedPath, setArrivedPath] = useState<string | null>(null);

  useEffect(() => {
    // Step 1: nothing new unless the saved upload changed since the form last looked.
    if (savedPath === null || savedPath === knownPath) return;
    setKnownPath(savedPath);
    // Step 2: the writer's own upload, saved from this form, is already in it: nothing to say.
    if (formHolds(cover, savedPath)) return;
    // Step 3: a cover saved elsewhere: show it, and read its picture and check again.
    setCover({ kind: 'upload', tallPath: savedPath });
    setArrivedPath(savedPath);
    void queryClient.invalidateQueries({ queryKey: ['story-cover-picture', story.slug] });
  }, [savedPath, knownPath, cover, setCover, queryClient, story.slug]);

  return arrivedPath;
}
