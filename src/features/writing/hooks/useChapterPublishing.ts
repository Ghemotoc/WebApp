/**
 * useChapterPublishing: the Publish panel's state and actions (story S1-E3-03; board 4.3,
 * "Publish").
 *
 * Who calls it: ChapterEditorPage. What it calls: api/chapters.ts → publish_chapter(),
 * schedule_chapter(), cancel_schedule(), update_published_chapter() and unpublish_chapter().
 * Before publishing, scheduling or updating, it asks the autosave to save and checks that
 * everything is saved, so what goes live is exactly what the writer sees (decided 23 Oct 2026,
 * Q10: edits reach readers only through "Update chapter").
 * It keeps the chapter's status itself after each action, because the editor's copy of the
 * chapter is loaded once and never refetched while it is open.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { trackEvent } from '@/lib/analytics/track';

import {
  runChapterAction,
  scheduleChapter,
  type ChapterActionOutcome,
  type ChapterStatus,
  type MyChapter,
} from '../api/chapters';

import { myStoriesKey } from './useMyStories';

/** What the panel can do. */
export type PublishAction =
  | { kind: 'publish' }
  | { kind: 'schedule'; at: Date }
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
export type PublishProblem = 'notSaved' | 'empty' | 'badTime' | 'notActive' | 'failed';

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
      return current;
  }
}

/** The message for an outcome that isn't "ok". */
function problemFor(outcome: ChapterActionOutcome): PublishProblem {
  if (outcome === 'empty') return 'empty';
  if (outcome === 'bad_time') return 'badTime';
  if (outcome === 'not_active') return 'notActive';
  return 'failed';
}

/** Sends one action to the database. */
async function send(code: string, action: PublishAction): Promise<ChapterActionOutcome> {
  const client = await requireClient();
  if (action.kind === 'schedule') return scheduleChapter(client, code, action.at);
  const functionName = {
    publish: 'publish_chapter',
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
 * @returns state, problem (or null), isBusy, and run(action)
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
    },
    onError: () => setProblem('failed'),
  });

  return {
    state,
    problem,
    isBusy: mutation.isPending,
    run: (action: PublishAction) => mutation.mutate(action),
  };
}
