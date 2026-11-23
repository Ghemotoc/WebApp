/**
 * useNewStoryForm: the new story form's state, checks and the create call (story S1-E3-01).
 *
 * Who calls it: NewStoryPage. What it calls: the zod schema (src/schemas/story.ts) to check the
 * answers, then api/stories.ts → create_story(); on success the writer's story list is refreshed,
 * who can read it and "Set in" are saved (saveNewStoryExtras(), CALM-9 board D02), chapter one is
 * made (api/chapters.ts → create_chapter(), S1-E3-02a) and the editor opens on it;
 * a story made from Story Atlas (?from=plan) opens on its plan instead (S1-E17-01).
 * Errors: each field's mistake is a translation key; 'not_active' and a failed call become a
 * plain message at the top of the form. The wizard (CALM-9) checks the basics on "Next" with
 * checkFields(), and opens the first step with a mistake when Create finds one.
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { promptIdFrom, startStoryFromPrompt } from '@/features/hub/api/hubPrompts';
import { hubPromptsKey } from '@/features/hub/hooks/useHubPrompts';
import { newStorySchema, type NewStoryInput } from '@/schemas/story';
import { trackEvent } from '@/lib/analytics/track';

import { createChapter } from '../api/chapters';
import { createStory, saveNewStoryExtras } from '../api/stories';

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
    // GAPS-15: a new story reads on the web and in the app; the choice is in its settings.
    isAppOnly: false,
    hiddenInCountries: [],
    // CALM-9 (board D02): "Set in" starts empty; the writer adds countries in step 2.
    setInCountries: [],
    commentsEnabled: true,
    // MUST-1a: the database starts a writer under 18 at Followers only; the new story form
    // doesn't show the setting (docs/board-fixes.md), so this is only the form's own default.
    commentAudience: 'everyone',
    // CALM-8: a new story starts without a pause of new comments (it is set in its settings).
    commentPause: null,
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
 * Ties the new story to its prompt (GAPS-12c). The story is already made, so a failure here must
 * not lose it: the writer goes on to chapter one and only the hub's count misses this story.
 *
 * @param queryClient - to refresh the hub's prompt counts
 * @param storySlug - the new story's address
 * @param promptId - the prompt the writer started from
 */
async function rememberPrompt(queryClient: QueryClient, storySlug: string, promptId: string) {
  try {
    await startStoryFromPrompt(await requireClient(), storySlug, promptId);
    await queryClient.invalidateQueries({ queryKey: hubPromptsKey });
  } catch (error) {
    // Said in the console for whoever debugs it; there is nothing the writer could do about it.
    console.warn('The story was made, but its prompt was not saved.', error);
  }
}

/**
 * Saves the wizard's answers create_story() doesn't take (who can read it, "Set in"; CALM-9).
 *
 * @returns false when that didn't work, so the page can send the writer to the story's settings
 */
async function saveExtrasSafely(storySlug: string, input: NewStoryInput): Promise<boolean> {
  try {
    return (await saveNewStoryExtras(await requireClient(), storySlug, input)) === 'ok';
  } catch (error) {
    console.warn(
      'The story was made, but who can read it or where it is set was not saved.',
      error,
    );
    return false;
  }
}

/**
 * Makes chapter one straight away and opens the editor on it (board 4.2's "Create and write
 * chapter one"); if that fails the story is still there on Your writing, which says so.
 *
 * @param navigate - the router's navigate
 * @param storySlug - the new story's address
 */
async function openChapterOne(navigate: NavigateFunction, storySlug: string) {
  try {
    const chapter = await createChapter(await requireClient(), storySlug);
    if (chapter.outcome === 'ok') {
      await navigate(`/write/s/${storySlug}/c/${chapter.code}`);
      return;
    }
  } catch {
    // Fall through to the list: the story exists and "Write chapter one" is there.
  }
  await navigate('/write', { state: { createdSlug: storySlug, chapterFailed: true } });
}

/**
 * The mistakes among some of the answers (one wizard step's), as translation keys.
 *
 * @param answers - every answer so far
 * @param fields - the answers to look at
 * @returns one message key per field with a mistake; empty when they are all right
 */
function mistakesIn(
  answers: StoryAnswers,
  fields: readonly (keyof StoryAnswers)[],
): StoryFieldErrors {
  const result = newStorySchema.safeParse(answers);
  if (result.success) return {};
  const issues = result.error.issues.filter((issue) =>
    fields.some((field) => field === issue.path[0]),
  );
  return toStoryFieldErrors(issues);
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

  const create = useMutation({
    mutationFn: async (input: NewStoryInput) => createStory(await requireClient(), input),
    onSuccess: async (result, input) => {
      // Step 3: a read-only account gets the plain message; a new story goes to the list.
      if (result.outcome === 'not_active') {
        setFormError('notActive');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      // Step 3b (CALM-9): who can read it and "Set in". The story exists already, so if this
      // fails the writer goes to its settings, where both show as saved and can be set again.
      if (!(await saveExtrasSafely(result.slug, input))) {
        await navigate(`/write/s/${result.slug}/settings`);
        return;
      }
      // A story started from the hub's "Write from this prompt" remembers its prompt (GAPS-12c).
      if (promptId !== null) await rememberPrompt(queryClient, result.slug, promptId);
      // The category only, never the story (docs/analytics-events.md).
      trackEvent('story_created', { category: input.categorySlug });
      // Step 4 (S1-E17-01): a story made from Story Atlas opens on its plan's at-a-glance page.
      if (startedFromAtlas) {
        await navigate(`/plan/s/${result.slug}`);
        return;
      }
      // Step 5: chapter one, and the editor opens on it.
      await openChapterOne(navigate, result.slug);
    },
    onError: () => setFormError('createFailed'),
  });

  /** Changes one answer and clears that field's error, so the message goes as the writer fixes it. */
  function set<Field extends keyof StoryAnswers>(field: Field, value: StoryAnswers[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  /**
   * Checks only the fields given (one wizard step's), showing their mistakes.
   *
   * @param fields - the answers the step asks for
   * @returns true when none of them has a mistake
   */
  function checkFields(fields: readonly (keyof StoryAnswers)[]): boolean {
    const stepErrors = mistakesIn(answers, fields);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  /**
   * Checks every answer; sends them only when all are right.
   *
   * @returns the fields with a mistake (empty when the answers were sent)
   */
  function submit(): (keyof StoryAnswers)[] {
    // Step 1: the shared rules; the database checks them again (architecture 1.7.1).
    const result = newStorySchema.safeParse(answers);
    if (!result.success) {
      const fieldErrors = toStoryFieldErrors(result.error.issues);
      setErrors(fieldErrors);
      return Object.keys(fieldErrors) as (keyof StoryAnswers)[];
    }
    // Step 2: send.
    setFormError(null);
    create.mutate(result.data);
    return [];
  }

  return { answers, set, errors, formError, checkFields, submit, isSubmitting: create.isPending };
}
