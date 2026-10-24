/**
 * useNewStoryForm: the new story form's state, checks and the create call (story S1-E3-01).
 *
 * Who calls it: NewStoryPage. What it calls: the zod schema (src/schemas/story.ts) to check the
 * answers, then api/stories.ts → create_story(); on success the writer's story list is refreshed
 * and the page moves to /write (the chapter editor, S1-E3-02a, takes over from there).
 * Errors: each field's mistake is a translation key; 'not_active' and a failed call become a
 * plain message at the top of the form.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { newStorySchema, type NewStoryInput, type StoryCoverChoice } from '@/schemas/story';

import { createStory } from '../api/stories';

import { myStoriesKey } from './useMyStories';

/** The answers as the form keeps them while typing. */
export interface NewStoryAnswers {
  title: string;
  blurb: string;
  languageCode: string;
  categorySlug: string;
  tags: string[];
  cover: StoryCoverChoice;
}

/** A translation key per field that has a mistake. */
export type FieldErrors = Partial<Record<keyof NewStoryAnswers, string>>;

/** What the form starts with: Romanian (the first market) and fiction, as the board shows. */
const emptyAnswers: NewStoryAnswers = {
  title: '',
  blurb: '',
  languageCode: 'ro',
  categorySlug: 'fiction',
  tags: [],
  cover: { kind: 'automatic' },
};

/**
 * Turns zod's issues into one message key per field (the first issue wins).
 *
 * @param issues - from safeParse
 * @returns the field errors
 */
function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0] as keyof NewStoryAnswers | undefined;
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}

/**
 * Keeps the answers, checks them and creates the story.
 *
 * @returns answers, set (changes one field), errors, formError ('notActive' | 'createFailed'
 *   | null), submit, isSubmitting
 */
export function useNewStoryForm() {
  const [answers, setAnswers] = useState<NewStoryAnswers>(emptyAnswers);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<'notActive' | 'createFailed' | null>(null);
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: async (input: NewStoryInput) => createStory(await requireClient(), input),
    onSuccess: async (result) => {
      // Step 3: a read-only account gets the plain message; a new story goes to the list.
      if (result.outcome === 'not_active') {
        setFormError('notActive');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      await navigate('/write', { state: { createdSlug: result.slug } });
    },
    onError: () => setFormError('createFailed'),
  });

  /** Changes one answer and clears that field's error, so the message goes as the writer fixes it. */
  function set<Field extends keyof NewStoryAnswers>(field: Field, value: NewStoryAnswers[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  /** Checks every answer; sends them only when all are right. */
  function submit() {
    // Step 1: the shared rules; the database checks them again (architecture 1.7.1).
    const result = newStorySchema.safeParse(answers);
    if (!result.success) {
      setErrors(toFieldErrors(result.error.issues));
      return;
    }
    // Step 2: send.
    setFormError(null);
    create.mutate(result.data);
  }

  return { answers, set, errors, formError, submit, isSubmitting: create.isPending };
}
