/**
 * useNewStoryForm: the new story form's state, checks and the create call (story S1-E3-01).
 *
 * Who calls it: NewStoryPage. What it calls: the zod schema (src/schemas/story.ts) to check the
 * answers, then api/stories.ts → create_story(); on success the writer's story list is refreshed,
 * chapter one is made (api/chapters.ts → create_chapter(), S1-E3-02a) and the editor opens on it;
 * a story made from Story Atlas (?from=plan) opens on its plan instead (S1-E17-01).
 * Errors: each field's mistake is a translation key; 'not_active' and a failed call become a
 * plain message at the top of the form.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { promptIdFrom, startStoryFromPrompt } from '@/features/hub/api/hubPrompts';
import { hubPromptsKey } from '@/features/hub/hooks/useHubPrompts';
import { newStorySchema, type NewStoryInput } from '@/schemas/story';
import { trackEvent } from '@/lib/analytics/track';

import { createChapter } from '../api/chapters';
import { createStory } from '../api/stories';

import { toStoryFieldErrors, type StoryAnswers, type StoryFieldErrors } from './storyAnswers';
import { myStoriesKey } from './useMyStories';

/**
 * What the form starts with: Romanian (the first market) and fiction, as the board shows, a
 * fresh story ID, the defaults a new story gets (Ongoing, comments on; S1-E3-05) and no labels
 * ticked (S1-E3-06).
 *
 * @returns the empty answers
 */
function emptyAnswers(): StoryAnswers {
  return {
    storyId: crypto.randomUUID(),
    title: '',
    blurb: '',
    languageCode: 'ro',
    categorySlug: 'fiction',
    tags: [],
    cover: { kind: 'automatic' },
    completionStatus: 'ongoing',
    // NEW-1: a new story is public; the writer can change it in the story's settings.
    visibility: 'public',
    commentsEnabled: true,
    quoteCardsEnabled: true,
    pictureSharingEnabled: true,
    // IDEAS-1c: our default card colour; the writer can pick one in the story's settings.
    cardColour: null,
    // The rating and the AI answer have no default: the writer must pick them (S1-E3-06).
    rating: null,
    isFanFiction: false,
    isParody: false,
    dealsWithAbuseOrCoercion: false,
    contentNote: '',
    aiDisclosure: null,
    // SPONSORS-f: none until the writer picks 16+ or 18+.
    ratingReasons: [],
  };
}

/**
 * Keeps the answers, checks them and creates the story.
 *
 * @returns answers, set (changes one field), errors, formError ('notActive' | 'createFailed'
 *   | null), submit, isSubmitting
 */
export function useNewStoryForm() {
  const [answers, setAnswers] = useState<StoryAnswers>(emptyAnswers);
  const [errors, setErrors] = useState<StoryFieldErrors>({});
  const [formError, setFormError] = useState<'notActive' | 'createFailed' | null>(null);
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // "New story" in Story Atlas links here with ?from=plan (S1-E17-01).
  const [searchParams] = useSearchParams();
  const startedFromAtlas = searchParams.get('from') === 'plan';

  // The hub's "Write from this prompt" links here with ?prompt=<ID> (GAPS-12c).
  const promptId = promptIdFrom(searchParams.get('prompt'));

  /**
   * Ties the new story to its prompt. The story is already made, so a failure here must not
   * lose it: the writer goes on to chapter one and only the hub's count misses this story.
   */
  async function rememberPrompt(storySlug: string) {
    if (promptId === null) return;
    try {
      await startStoryFromPrompt(await requireClient(), storySlug, promptId);
      await queryClient.invalidateQueries({ queryKey: hubPromptsKey });
    } catch (error) {
      // Said in the console for whoever debugs it; there is nothing the writer could do about it.
      console.warn('The story was made, but its prompt was not saved.', error);
    }
  }

  const create = useMutation({
    mutationFn: async (input: NewStoryInput) => createStory(await requireClient(), input),
    onSuccess: async (result, input) => {
      // Step 3: a read-only account gets the plain message; a new story goes to the list.
      if (result.outcome === 'not_active') {
        setFormError('notActive');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      // A story started from the hub's "Write from this prompt" remembers its prompt (GAPS-12c).
      await rememberPrompt(result.slug);
      // The category only, never the story (docs/analytics-events.md).
      trackEvent('story_created', { category: input.categorySlug });
      // Step 4 (S1-E17-01): a story made from Story Atlas opens on its plan's at-a-glance page.
      if (startedFromAtlas) {
        await navigate(`/plan/s/${result.slug}`);
        return;
      }
      // Step 5: chapter one is made straight away and the editor opens on it (board 4.2's
      // "Create and write chapter one"); if that fails the story is still there on Your writing.
      try {
        const chapter = await createChapter(await requireClient(), result.slug);
        if (chapter.outcome === 'ok') {
          await navigate(`/write/s/${result.slug}/c/${chapter.code}`);
          return;
        }
      } catch {
        // Fall through to the list: the story exists and "Write chapter one" is there.
      }
      await navigate('/write', { state: { createdSlug: result.slug, chapterFailed: true } });
    },
    onError: () => setFormError('createFailed'),
  });

  /** Changes one answer and clears that field's error, so the message goes as the writer fixes it. */
  function set<Field extends keyof StoryAnswers>(field: Field, value: StoryAnswers[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  /** Checks every answer; sends them only when all are right. */
  function submit() {
    // Step 1: the shared rules; the database checks them again (architecture 1.7.1).
    const result = newStorySchema.safeParse(answers);
    if (!result.success) {
      setErrors(toStoryFieldErrors(result.error.issues));
      return;
    }
    // Step 2: send.
    setFormError(null);
    create.mutate(result.data);
  }

  return { answers, set, errors, formError, submit, isSubmitting: create.isPending };
}
