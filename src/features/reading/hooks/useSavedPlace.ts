/**
 * useSavedPlace: keeps the reader's place in a chapter and offers it back next time, on any
 * device (story S1-E4-03, first criterion: "when they leave, their position is saved and offered
 * on any device next time").
 *
 * How:
 * - On opening, it reads the place saved for this chapter (my_place_in_chapter()). The reader
 *   screen offers "Go back to where you stopped" when the place is part-way through.
 * - Once the reader scrolls, it saves the place 3 seconds after the scrolling stops, and again
 *   when they leave the page or the tab is hidden. Opening a chapter without scrolling saves
 *   nothing, so a quick look never overwrites a place further on.
 * - The kind of screen (phone, tablet, computer) comes from the window width only.
 * Who calls it: ChapterReaderPage, for a signed-in reader with the text on screen.
 * What it calls: src/features/library/api/library.ts → my_place_in_chapter() and
 *   save_reading_position(), which also puts the story on the "Reading" shelf.
 */
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchPlaceInChapter, saveReadingPosition } from '@/features/library/api/library';
import { libraryQueryKey } from '@/features/library/libraryQueryKey';
import { deviceKindFor } from '@/features/library/lib/deviceKind';

/** How long scrolling has to stop before the place is saved. */
const saveDelayMilliseconds = 3000;

/** A place between these is worth offering; at the very start or end there is nothing to offer. */
const offeredBetween = { from: 3, to: 97 };

/**
 * Whether a saved place is worth offering to go back to.
 *
 * @param percent - the saved place, 0 to 100
 * @returns true part-way through the chapter
 */
export function isPlaceWorthOffering(percent: number): boolean {
  return percent >= offeredBetween.from && percent <= offeredBetween.to;
}

/**
 * Keeps and offers the place.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @param progress - how far through the text the reader is now, 0 to 100 (useReadingProgress)
 * @param isShowingText - true once a signed-in reader has the whole text on screen
 * @returns savedPercent: the place to offer (null when there is none worth offering)
 */
export function useSavedPlace(
  storySlug: string,
  chapterCode: string,
  progress: number,
  isShowingText: boolean,
) {
  const { userId, isKnown } = useSession();
  const canSave = isShowingText && isKnown && userId !== null;
  // Step 1: the place saved before this visit, read once.
  const place = useQuery({
    queryKey: [libraryQueryKey, 'place', storySlug, chapterCode, userId],
    enabled: canSave,
    staleTime: Infinity,
    queryFn: async () => fetchPlaceInChapter(await requireClient(), storySlug, chapterCode),
  });
  // Step 2: follow the reader's progress; the first value is where the page opened.
  const latestProgress = useRef(progress);
  const openingProgress = useRef<number | null>(null);
  const hasMoved = useRef(false);
  useEffect(() => {
    latestProgress.current = progress;
    if (openingProgress.current === null) openingProgress.current = progress;
    else if (progress !== openingProgress.current) hasMoved.current = true;
  }, [progress]);
  // Step 3: the save itself. A failed save only loses a place, so it goes to the console for
  // developers and the reader is not interrupted.
  const save = useCallback(() => {
    if (!canSave || !hasMoved.current) return;
    void (async () => {
      try {
        const client = await requireClient();
        await saveReadingPosition(client, {
          storySlug,
          chapterCode,
          percent: latestProgress.current,
          deviceKind: deviceKindFor(window.innerWidth),
        });
      } catch (error) {
        console.warn('The reading place was not saved.', error);
      }
    })();
  }, [canSave, storySlug, chapterCode]);
  useSaveTriggers(save, progress);
  const savedPercent = place.data?.percent ?? null;
  return {
    savedPercent: savedPercent !== null && isPlaceWorthOffering(savedPercent) ? savedPercent : null,
  };
}

/**
 * Calls save 3 seconds after the progress stops changing, when the tab is hidden and when the
 * page goes away.
 *
 * @param save - the save
 * @param progress - the reader's progress, whose changes restart the wait
 */
function useSaveTriggers(save: () => void, progress: number) {
  // Step 1: after the scrolling stops.
  useEffect(() => {
    const timer = window.setTimeout(save, saveDelayMilliseconds);
    return () => window.clearTimeout(timer);
  }, [save, progress]);
  // Step 2: when the reader switches tab or app, and when they leave the chapter.
  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', saveWhenHidden);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', saveWhenHidden);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [save]);
}
