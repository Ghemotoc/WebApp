/**
 * useCanvaStart: the start page's work: find the writer's story, let them pick where to start,
 * then send this tab to Canva (story S1-E3-12 criteria 1 and 4; templates IDEAS-2e).
 *
 * Who calls it: CanvaStartPage (/canva/start?story=<story ID>).
 * What it calls: useMyStories (the writer's own story, so a cover is only ever designed for it)
 * and useMyNames (the pen name a template places), then openCanvaDesign(), which answers
 * Canva's consent page or the new design; the tab goes there with window.location.assign(). It
 * goes once, when the writer presses "Open Canva".
 */
import { useRef, useState } from 'react';

import { requireClient, useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import { useMyStories } from '@/features/writing/hooks/useMyStories';
import type { CanvaTemplateKey } from '@/schemas/canva';

import { openCanvaDesign } from '../api/canva';
import { canvaFailureMessage, type CanvaMessage } from '../lib/canvaMessages';

/** What the start page shows. */
export type CanvaStartState =
  | { kind: 'waiting' }
  | { kind: 'choosing'; storyTitle: string; penName: string }
  | { kind: 'opening' }
  | { kind: 'signed_out' }
  | { kind: 'not_found' }
  | { kind: 'failed'; message: CanvaMessage };

/**
 * Sends the tab to Canva for one story, from the template the writer picks.
 *
 * @param storyId - the story's ID from the address
 * @returns what the page shows, and open(template), which leaves for Canva
 */
export function useCanvaStart(storyId: string): {
  state: CanvaStartState;
  open: (template: CanvaTemplateKey) => void;
} {
  const writing = useMyStories();
  const { names } = useMyNames();
  const story = writing.stories.find((candidate) => candidate.id === storyId);
  const penName = names === null ? '' : (displayName(names.handle, names.penName) ?? '');
  const [message, setMessage] = useState<CanvaMessage | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const hasStarted = useRef(false);

  /** Step 1: ask our server once, then leave for Canva. */
  function open(template: CanvaTemplateKey) {
    if (story === undefined || hasStarted.current) return;
    hasStarted.current = true;
    setIsOpening(true);
    void requireClient()
      .then((client) =>
        openCanvaDesign(client, { storyId: story.id, storyTitle: story.title, template, penName }),
      )
      .then((address) => window.location.assign(address))
      .catch((error: unknown) => setMessage(canvaFailureMessage(error)));
  }

  // Step 2: what to show meanwhile, or why nothing happens.
  return { state: stateOf({ writing, story, message, isOpening, penName }), open };
}

/**
 * What the page shows, in order: a failure, a wait, a plain reason, the opening line, the choice.
 *
 * @returns the state
 */
function stateOf(parts: {
  writing: ReturnType<typeof useMyStories>;
  story: { title: string } | undefined;
  message: CanvaMessage | null;
  isOpening: boolean;
  penName: string;
}): CanvaStartState {
  if (parts.message !== null) return { kind: 'failed', message: parts.message };
  if (!parts.writing.isKnown) return { kind: 'waiting' };
  if (!parts.writing.isSignedIn) return { kind: 'signed_out' };
  if (parts.story === undefined) return { kind: 'not_found' };
  if (parts.isOpening) return { kind: 'opening' };
  return { kind: 'choosing', storyTitle: parts.story.title, penName: parts.penName };
}
