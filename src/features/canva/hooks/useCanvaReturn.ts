/**
 * useCanvaReturn: the return page's work, for each way Canva sends the tab back (story S1-E3-12).
 *
 * - With ?code=…&state=… (the consent page said yes): checks the state against this tab's trip,
 *   connects Canva with the PKCE verifier, then opens the new design (criteria 1 and 4).
 * - With ?error=… (the writer said no on Canva's consent page): nothing was shared; say so.
 * - With ?correlation_jwt=… (Return in Canva): our server checks the token and exports the PNG;
 *   the tab uploads it as the story's cover through the picture check and saves it (criteria 2
 *   and 3).
 * Who calls it: CanvaReturnPage (/canva/return). What it calls: lib/canvaTrip.ts, api/canva.ts,
 * useMyStories; it refreshes the writer's stories and covers once a cover is saved.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { bringBackCanvaDesign, connectCanva, openCanvaDesign, saveCanvaCover } from '../api/canva';
import { rememberedCanvaTrip } from '../lib/canvaTrip';
import { canvaFailureMessage, type CanvaMessage } from '../lib/canvaMessages';

/** What the return page shows. Each carries the story's slug when known, for the way back. */
export type CanvaReturnState =
  | { kind: 'working' }
  | { kind: 'cancelled'; slug: string | null }
  | { kind: 'saved'; slug: string; isChecking: boolean }
  | { kind: 'failed'; message: CanvaMessage; slug: string | null };

/** What the address says Canva sent back. */
type CanvaAnswer =
  | { kind: 'connect'; code: string; state: string }
  | { kind: 'return'; correlationJwt: string }
  | { kind: 'cancelled' }
  | { kind: 'nothing' };

/**
 * Reads the address.
 *
 * @returns what Canva sent back
 */
function answerFrom(params: URLSearchParams): CanvaAnswer {
  const correlationJwt = params.get('correlation_jwt');
  if (correlationJwt !== null) return { kind: 'return', correlationJwt };
  if (params.get('error') !== null) return { kind: 'cancelled' };
  const code = params.get('code');
  const state = params.get('state');
  if (code !== null && state !== null) return { kind: 'connect', code, state };
  return { kind: 'nothing' };
}

/**
 * Connects Canva, then sends the tab to the new design.
 *
 * @param answer - the code and state from the address
 */
async function connectThenDesign(answer: { code: string; state: string }): Promise<void> {
  const trip = rememberedCanvaTrip();
  // The state must be the one this tab sent, or the link wasn't made by this writer's trip.
  if (trip === null || trip.state !== answer.state) throw new Error('state_mismatch');
  const client = await requireClient();
  await connectCanva(client, { code: answer.code, codeVerifier: trip.codeVerifier });
  const address = await openCanvaDesign(client, {
    storyId: trip.storyId,
    storyTitle: trip.storyTitle,
  });
  window.location.assign(address);
}

/**
 * Brings the design back and saves it as the cover of the writer's own story.
 *
 * @param stories - the writer's stories
 * @returns the story's slug and whether the picture is still being checked
 */
async function bringBackAndSave(correlationJwt: string, stories: MyStory[]) {
  const client = await requireClient();
  const returned = await bringBackCanvaDesign(client, correlationJwt);
  const story = stories.find((candidate) => candidate.id === returned.storyId);
  if (story === undefined) throw new Error('story_not_found');
  const status = await saveCanvaCover(
    client,
    { storyId: story.id, slug: story.slug },
    returned.file,
  );
  // "passed" is the picture check's yes (approved is a moderator's; both show to readers).
  return { slug: story.slug, isChecking: status !== 'passed' && status !== 'approved' };
}

/**
 * The message for a failed step, including the return page's own two reasons.
 *
 * @returns the message
 */
function messageFor(error: unknown): CanvaMessage {
  if (error instanceof Error && error.message === 'state_mismatch') {
    return { key: 'writing:canva.failed.expired' };
  }
  if (error instanceof Error && error.message === 'story_not_found') {
    return { key: 'writing:canva.failed.storyNotFound' };
  }
  return canvaFailureMessage(error);
}

/**
 * Does the work for whatever Canva sent back.
 *
 * @returns what the page shows
 */
export function useCanvaReturn(): CanvaReturnState {
  const [params] = useSearchParams();
  const writing = useMyStories();
  const queryClient = useQueryClient();
  const [state, setState] = useState<CanvaReturnState>({ kind: 'working' });
  const hasStarted = useRef(false);
  const answer = useMemo(() => answerFrom(params), [params]);
  const trip = rememberedCanvaTrip();
  const tripSlug = writing.stories.find((story) => story.id === trip?.storyId)?.slug ?? null;

  // Step 1: once the writer's stories are known, do the one step the address asks for.
  useEffect(() => {
    if (!writing.isKnown || hasStarted.current) return;
    if (answer.kind !== 'connect' && answer.kind !== 'return') return;
    hasStarted.current = true;
    const fail = (error: unknown) =>
      setState({ kind: 'failed', message: messageFor(error), slug: null });
    if (answer.kind === 'connect') {
      void connectThenDesign(answer).catch(fail);
      return;
    }
    void bringBackAndSave(answer.correlationJwt, writing.stories)
      .then((saved) => {
        void queryClient.invalidateQueries({ queryKey: ['my-stories'] });
        void queryClient.invalidateQueries({ queryKey: ['story-cover-picture'] });
        setState({ kind: 'saved', ...saved });
      })
      .catch(fail);
  }, [answer, writing.isKnown, writing.stories, queryClient]);

  // Step 2: the answers that need no work, then the work's own state.
  if (answer.kind === 'cancelled') return { kind: 'cancelled', slug: tripSlug };
  if (answer.kind === 'nothing') {
    return { kind: 'failed', message: { key: 'writing:canva.failed.invalid' }, slug: tripSlug };
  }
  if (state.kind === 'failed') return { ...state, slug: tripSlug };
  return state;
}
