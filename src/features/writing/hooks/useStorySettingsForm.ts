/**
 * useStorySettingsForm: the story settings form's state, checks and the save call
 * (story S1-E3-05).
 *
 * Who calls it: StorySettingsPage. What it calls: the zod schema (src/schemas/story.ts) to
 * check the answers, then api/stories.ts → update_my_story(); on success the writer's story
 * list is refreshed and "Saved." shows.
 * It starts from the story as saved, so the sections (shared with the new story form) show the
 * current values and the writer changes only what they want. A cover saved from another tab,
 * such as one made in Canva, replaces the form's cover by itself (useArrivingCover, IDEAS-2d).
 * It also knows whether anything changed since the last save (isDirty), so the save bar can say
 * "You have unsaved changes" and Cancel can put every answer back (liquid glass StorySettings
 * board, bundle G9 WRITING, part d).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  storySettingsSchema,
  type StoryCoverChoice,
  type StorySettingsInput,
} from '@/schemas/story';

import { updateMyStory, type MyStory, type SettingsOutcome } from '../api/stories';

import { toStoryFieldErrors, type StoryAnswers, type StoryFieldErrors } from './storyAnswers';
import { useArrivingCover } from './useArrivingCover';
import { myStoriesKey } from './useMyStories';

/**
 * The story's stored cover as the form keeps it: the upload, the drawn choice or automatic.
 *
 * @param story - the writer's story
 * @returns the cover answer
 */
function coverAnswerFor(story: MyStory): StoryCoverChoice {
  if (story.coverKind === 'upload' && story.coverTallPath !== null) {
    return { kind: 'upload', tallPath: story.coverTallPath };
  }
  if (story.drawnCover !== null) return { kind: 'drawn', ...story.drawnCover };
  return { kind: 'automatic' };
}

/**
 * The answers as the story is saved today.
 *
 * @param story - the writer's story
 * @returns the answers
 */
function answersFrom(story: MyStory): StoryAnswers {
  return {
    storyId: story.id,
    title: story.title,
    blurb: story.blurb,
    languageCode: story.languageCode,
    categorySlug: story.categorySlug,
    tags: story.tags,
    cover: coverAnswerFor(story),
    completionStatus: story.completionStatus,
    visibility: story.visibility,
    isAppOnly: story.isAppOnly,
    commentsEnabled: story.commentsEnabled,
    quoteCardsEnabled: story.quoteCardsEnabled,
    pictureSharingEnabled: story.pictureSharingEnabled,
    cardColour: story.cardColour,
    rating: story.rating,
    isFanFiction: story.isFanFiction,
    isParody: story.isParody,
    dealsWithAbuseOrCoercion: story.dealsWithAbuseOrCoercion,
    contentNote: story.contentNote,
    aiDisclosure: story.aiDisclosure,
    ratingReasons: story.ratingReasons,
  };
}

/**
 * Keeps the answers, checks them and saves the settings.
 *
 * @param story - the story being edited
 * @returns answers, set, errors, outcome (null | 'saved' | 'not_active' | 'not_found' |
 *   'save_failed'), save, isSaving, arrivedCoverPath (a cover saved from another tab, or null),
 *   isDirty (something changed since the last save) and discard (put the saved answers back)
 */
export function useStorySettingsForm(story: MyStory) {
  const [answers, setAnswers] = useState<StoryAnswers>(() => answersFrom(story));
  // The answers as last saved, to tell whether anything changed since.
  const [savedAnswers, setSavedAnswers] = useState<StoryAnswers>(() => answersFrom(story));
  const [errors, setErrors] = useState<StoryFieldErrors>({});
  const [outcome, setOutcome] = useState<SettingsOutcome | 'saved' | 'save_failed' | null>(null);
  const { userId } = useSession();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (input: StorySettingsInput) =>
      updateMyStory(await requireClient(), story.slug, input),
    onSuccess: async (result) => {
      setOutcome(result === 'ok' ? 'saved' : result);
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      // The tags may have changed, so the rank badge picker reads them again (CMS-1g).
      await queryClient.invalidateQueries({ queryKey: ['tag-ranks', story.slug] });
    },
    onError: () => setOutcome('save_failed'),
  });

  /** Changes one answer and clears its error and the last outcome. */
  function set<Field extends keyof StoryAnswers>(field: Field, value: StoryAnswers[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setOutcome(null);
  }

  // A cover saved from another tab (made in Canva) comes into the form by itself (IDEAS-2d).
  const setCover = useCallback((cover: StoryCoverChoice) => {
    setAnswers((current) => ({ ...current, cover }));
  }, []);
  const arrivedCoverPath = useArrivingCover(story, answers.cover, setCover);

  /** Checks every answer; saves only when all are right. */
  function submit() {
    const result = storySettingsSchema.safeParse(answers);
    if (!result.success) {
      setErrors(toStoryFieldErrors(result.error.issues));
      return;
    }
    // The answers as sent become the new starting point once the save goes through, so the
    // save bar stops saying "unsaved" (they are kept as typed, so the comparison stays exact).
    const sentAnswers = answers;
    save.mutate(result.data, {
      onSuccess: (outcomeOfSave) => {
        if (outcomeOfSave === 'ok') setSavedAnswers(sentAnswers);
      },
    });
  }

  /** Cancel: every answer goes back to what was last saved, and the errors clear. */
  function discard() {
    setAnswers(savedAnswers);
    setErrors({});
    setOutcome(null);
  }

  return {
    answers,
    set,
    errors,
    outcome,
    submit,
    isSaving: save.isPending,
    arrivedCoverPath,
    // Compared as JSON: the answers are plain data (text, lists and small objects).
    isDirty: JSON.stringify(answers) !== JSON.stringify(savedAnswers),
    discard,
  };
}
