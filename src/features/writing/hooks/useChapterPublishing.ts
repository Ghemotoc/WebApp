/**
 * useChapterPublishing: the Publish panel's state and actions (story S1-E3-03; board 4.3,
 * "Publish").
 *
 * Who calls it: ChapterEditorPage. What it calls: api/chapters.ts → publish_chapter(),
 * schedule_chapter(), cancel_schedule(), update_published_chapter() and unpublish_chapter();
 * api/lastChapter.ts → the "This is the last chapter" switch and what the panel shows about it
 * (CALM-6); api/followersToTell.ts → the number beside "Tell followers" (board D06).
 * Before publishing, scheduling or updating, it asks the autosave to save and checks that
 * everything is saved, so what goes live is exactly what the writer sees (decided 23 Oct 2026,
 * Q10: edits reach readers only through "Update chapter").
 * It keeps the chapter's status itself after each action, because the editor's copy of the
 * chapter is loaded once and never refetched while it is open.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { chapterProgressQueryKey } from '@/features/atlas/api/chapterPlans';
import { useSession } from '@/features/auth/hooks/useSession';
import { trackEvent } from '@/lib/analytics/track';

import {
  runChapterAction,
  scheduleChapter,
  type ChapterActionOutcome,
  type ChapterStatus,
  type MyChapter,
} from '../api/chapters';
import { fetchFollowersToTell } from '../api/followersToTell';
import {
  fetchChapterLastState,
  publishChapter,
  setChapterLast,
  type ChapterLastState,
} from '../api/lastChapter';

import { myStoriesKey } from './useMyStories';

/** What the panel can do. */
export type PublishAction =
  // Board D06: tellFollowers is the "Tell followers" switch.
  | { kind: 'publish'; asLast: boolean; tellFollowers: boolean }
  | { kind: 'schedule'; at: Date; asLast: boolean; tellFollowers: boolean }
  // CALM-6: the switch on a chapter already scheduled or out.
  | { kind: 'setLast'; isLast: boolean }
  | { kind: 'cancelSchedule' }
  | { kind: 'update' }
  | { kind: 'unpublish' };

/** What the panel shows about the chapter. */
export interface PublishingState {
  status: ChapterStatus;
  scheduledFor: Date | null;
  lastPublishedAt: Date | null;
}

/** The message under the buttons: a refusal or a failure, as a key in editor.json. */
export type PublishProblem =
  'notSaved' | 'empty' | 'badTime' | 'notActive' | 'originalNotPublished' | 'notLast' | 'failed';

/** What the hook needs from the autosave. */
export interface AutosaveForPublishing {
  saveNow: () => Promise<void>;
  isAllSaved: () => boolean;
}

/** The status after an action went through. */
function stateAfter(action: PublishAction, current: PublishingState): PublishingState {
  const now = new Date();
  switch (action.kind) {
    case 'publish':
      return { status: 'published', scheduledFor: null, lastPublishedAt: now };
    case 'schedule':
      return { ...current, status: 'scheduled', scheduledFor: action.at };
    case 'cancelSchedule':
    case 'unpublish':
      return { ...current, status: 'draft', scheduledFor: null };
    case 'update':
    case 'setLast':
      return current;
  }
}

/** The message for an outcome that isn't "ok". */
function problemFor(outcome: ChapterActionOutcome): PublishProblem {
  if (outcome === 'empty') return 'empty';
  if (outcome === 'bad_time') return 'badTime';
  if (outcome === 'not_active') return 'notActive';
  // A translated chapter opened in the full editor: its original is still a draft (TRANSLATE-1).
  if (outcome === 'original_not_published') return 'originalNotPublished';
  // CALM-6: a later chapter is already out or scheduled.
  if (outcome === 'not_last') return 'notLast';
  return 'failed';
}

/** Sends one action to the database. */
async function send(code: string, action: PublishAction): Promise<ChapterActionOutcome> {
  const client = await requireClient();
  if (action.kind === 'schedule') {
    return scheduleChapter(client, code, action.at, {
      asLast: action.asLast,
      tellFollowers: action.tellFollowers,
    });
  }
  if (action.kind === 'publish') {
    return publishChapter(client, code, action.asLast, action.tellFollowers);
  }
  if (action.kind === 'setLast') return setChapterLast(client, code, action.isLast);
  const functionName = {
    cancelSchedule: 'cancel_schedule',
    update: 'update_published_chapter',
    unpublish: 'unpublish_chapter',
  } as const;
  return runChapterAction(client, functionName[action.kind], code);
}

/**
 * Runs the panel.
 *
 * @param chapter - the chapter as the editor loaded it
 * @param autosave - saveNow and isAllSaved from useAutosave
 * @returns state, lastState (the mark, CALM-6; null while it loads), followersToTell (board D06;
 *   null while it loads), problem (or null), isBusy and run(action)
 */
export function useChapterPublishing(chapter: MyChapter, autosave: AutosaveForPublishing) {
  const [state, setState] = useState<PublishingState>(() => ({
    status: chapter.status,
    scheduledFor: chapter.scheduledFor === null ? null : new Date(chapter.scheduledFor),
    lastPublishedAt: chapter.lastPublishedAt === null ? null : new Date(chapter.lastPublishedAt),
  }));
  const [problem, setProblem] = useState<PublishProblem | null>(null);
  const { userId } = useSession();
  const queryClient = useQueryClient();
  // CALM-6: what the panel shows about the last-chapter mark, read again after every action.
  const lastStateKey = ['chapterLastState', chapter.code] as const;
  const lastState = useQuery({
    queryKey: lastStateKey,
    queryFn: async () => fetchChapterLastState(await requireClient(), chapter.code),
  });
  // Board D06: how many followers hear when it goes out, for the line under "Tell followers".
  const followersToTell = useQuery({
    queryKey: ['chapterFollowersToTell', chapter.code] as const,
    queryFn: async () => fetchFollowersToTell(await requireClient(), chapter.code),
  });

  const mutation = useMutation({
    mutationFn: async (action: PublishAction) => {
      // Step 1: anything that puts text live first saves it, and stops if it couldn't.
      if (action.kind === 'publish' || action.kind === 'schedule' || action.kind === 'update') {
        await autosave.saveNow();
        if (!autosave.isAllSaved()) return { action, outcome: 'not_saved' as const };
      }
      // Step 2: the database does the rest and says how it went.
      return { action, outcome: await send(chapter.code, action) };
    },
    onSuccess: async ({ action, outcome }) => {
      if (outcome === 'not_saved') return setProblem('notSaved');
      if (outcome !== 'ok') return setProblem(problemFor(outcome));
      setProblem(null);
      setState((current) => stateAfter(action, current));
      // No properties: never which chapter (docs/analytics-events.md).
      if (action.kind === 'publish') trackEvent('chapter_published', {});
      if (action.kind === 'schedule') trackEvent('chapter_scheduled', {});
      // Your writing shows the chapter's status and "Only you can see this story" from this.
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      await queryClient.invalidateQueries({ queryKey: lastStateKey });
      // The editor's chapter list says each chapter's state under its name (board D05).
      await queryClient.invalidateQueries({
        queryKey: chapterProgressQueryKey(userId, chapter.story.slug),
      });
    },
    onError: () => setProblem('failed'),
  });

  return {
    state,
    lastState: (lastState.data ?? null) satisfies ChapterLastState | null,
    followersToTell: followersToTell.data ?? null,
    problem,
    isBusy: mutation.isPending,
    run: (action: PublishAction) => mutation.mutate(action),
  };
}
