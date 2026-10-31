/**
 * useCanvaStart: the start page's work: find the writer's story, then send this tab to Canva
 * (story S1-E3-12 criteria 1 and 4).
 *
 * Who calls it: CanvaStartPage (/canva/start?story=<story ID>).
 * What it calls: useMyStories (the writer's own story, so a cover is only ever designed for it),
 * then openCanvaDesign(), which answers Canva's consent page or the new design; the tab goes
 * there with window.location.assign(). It runs once per page.
 */
import { useEffect, useRef, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { openCanvaDesign } from '../api/canva';
import { canvaFailureMessage, type CanvaMessage } from '../lib/canvaMessages';

/** What the start page shows. */
export type CanvaStartState =
  | { kind: 'waiting' }
  | { kind: 'opening' }
  | { kind: 'signed_out' }
  | { kind: 'not_found' }
  | { kind: 'failed'; message: CanvaMessage };

/**
 * Sends the tab to Canva for one story.
 *
 * @param storyId - the story's ID from the address
 * @returns what the page shows
 */
export function useCanvaStart(storyId: string): CanvaStartState {
  const writing = useMyStories();
  const story = writing.stories.find((candidate) => candidate.id === storyId);
  const [message, setMessage] = useState<CanvaMessage | null>(null);
  const hasStarted = useRef(false);

  // Step 1: once the story is known, ask our server once, then leave for Canva.
  useEffect(() => {
    if (story === undefined || hasStarted.current) return;
    hasStarted.current = true;
    void requireClient()
      .then((client) => openCanvaDesign(client, { storyId: story.id, storyTitle: story.title }))
      .then((address) => window.location.assign(address))
      .catch((error: unknown) => setMessage(canvaFailureMessage(error)));
  }, [story]);

  // Step 2: what to show meanwhile, or why nothing happens.
  if (message !== null) return { kind: 'failed', message };
  if (!writing.isKnown) return { kind: 'waiting' };
  if (!writing.isSignedIn) return { kind: 'signed_out' };
  if (story === undefined) return { kind: 'not_found' };
  return { kind: 'opening' };
}
