/**
 * useStorySettingsForm: the story settings form's state, checks and the save call
 * (story S1-E3-05).
 *
 * Who calls it: StorySettingsPage. What it calls: the zod schema (src/schemas/story.ts) to
 * check the answers, then api/stories.ts → update_my_story(); on success the writer's story
 * list is refreshed and "Saved." shows.
 * It starts from the story as saved, so the sections (shared with the new story form) show the
 * current values and the writer changes only what they want.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { storySettingsSchema, type StorySettingsInput } from '@/schemas/story';

import { updateMyStory, type MyStory, type SettingsOutcome } from '../api/stories';

import { toStoryFieldErrors, type StoryAnswers, type StoryFieldErrors } from './storyAnswers';
import { myStoriesKey } from './useMyStories';

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
    cover:
      story.drawnCover === null ? { kind: 'automatic' } : { kind: 'drawn', ...story.drawnCover },
    completionStatus: story.completionStatus,
    commentsEnabled: story.commentsEnabled,
    rating: story.rating,
    isFanFiction: story.isFanFiction,
    isParody: story.isParody,
    dealsWithAbuseOrCoercion: story.dealsWithAbuseOrCoercion,
    contentNote: story.contentNote,
    aiDisclosure: story.aiDisclosure,
  };
}

/**
 * Keeps the answers, checks them and saves the settings.
 *
 * @param story - the story being edited
 * @returns answers, set, errors, outcome (null | 'saved' | 'not_active' | 'not_found' |
 *   'save_failed'), save, isSaving
 */
export function useStorySettingsForm(story: MyStory) {
  const [answers, setAnswers] = useState<StoryAnswers>(() => answersFrom(story));
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
    },
    onError: () => setOutcome('save_failed'),
  });

  /** Changes one answer and clears its error and the last outcome. */
  function set<Field extends keyof StoryAnswers>(field: Field, value: StoryAnswers[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setOutcome(null);
  }

  /** Checks every answer; saves only when all are right. */
  function submit() {
    const result = storySettingsSchema.safeParse(answers);
    if (!result.success) {
      setErrors(toStoryFieldErrors(result.error.issues));
      return;
    }
    save.mutate(result.data);
  }

  return { answers, set, errors, outcome, submit, isSaving: save.isPending };
}
