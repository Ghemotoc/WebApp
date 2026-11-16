/**
 * useAddLanguage: the answers and the sending of the "Add a language" form (bundle TRANSLATE-1c;
 * board TrSettings).
 *
 * Who calls it: AddLanguageForm. What it calls: api/storyLanguages.ts → add_story_language();
 * then it refreshes the story's languages so the new row shows in the table.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import { addStoryLanguage } from '../api/storyLanguages';

import { storyLanguagesKey } from './useStoryLanguages';

/** What went wrong, as a key under "add.problems" in the storyLanguages texts. */
export type AddLanguageProblem =
  'languageMissing' | 'titleMissing' | 'languageTaken' | 'tooMany' | 'notActive' | 'failed';

/** The form's three answers. */
export interface AddLanguageAnswers {
  languageCode: string;
  title: string;
  blurb: string;
}

const emptyAnswers: AddLanguageAnswers = { languageCode: '', title: '', blurb: '' };

/** The problem with the answers before anything is sent, or null. */
function problemIn(answers: AddLanguageAnswers): AddLanguageProblem | null {
  if (answers.languageCode === '') return 'languageMissing';
  if (answers.title.trim() === '') return 'titleMissing';
  return null;
}

/** The problem a refusal from the database stands for. */
function problemFor(outcome: string): AddLanguageProblem {
  if (outcome === 'language_taken') return 'languageTaken';
  if (outcome === 'too_many') return 'tooMany';
  if (outcome === 'not_active') return 'notActive';
  return 'failed';
}

/**
 * Runs the form.
 *
 * @param storySlug - the story the language is added to
 * @returns answers, set (one answer), reset, submit, isSending and problem (or null)
 */
export function useAddLanguage(storySlug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<AddLanguageAnswers>(emptyAnswers);
  const [problem, setProblem] = useState<AddLanguageProblem | null>(null);
  const [isSending, setIsSending] = useState(false);

  /** Changes one answer, keeping it inside the same limits as a new story (S1-E3-01). */
  function set(field: keyof AddLanguageAnswers, value: string) {
    const limit = field === 'blurb' ? MAXIMUM_BLURB_LENGTH : MAXIMUM_TITLE_LENGTH;
    setAnswers((current) => ({ ...current, [field]: value.slice(0, limit) }));
    setProblem(null);
  }

  /** Empties the form (Cancel, and after a language was added). */
  function reset() {
    setAnswers(emptyAnswers);
    setProblem(null);
  }

  /** Checks the answers, sends them, and shows the new language or why not. */
  async function submit() {
    // Step 1: a language and a title are needed before anything is sent.
    const found = problemIn(answers);
    if (found !== null) return setProblem(found);
    setIsSending(true);
    try {
      // Step 2: the database adds the edition, or says why not.
      const result = await addStoryLanguage(await requireClient(), storySlug, answers);
      if (result.outcome !== 'ok') return setProblem(problemFor(result.outcome));
      // Step 3: the table reads the languages again, and the form is ready for another one.
      await queryClient.invalidateQueries({ queryKey: storyLanguagesKey(userId, storySlug) });
      reset();
    } catch {
      // The database refused the words or couldn't be reached: one plain message, try again.
      setProblem('failed');
    } finally {
      setIsSending(false);
    }
  }

  return { answers, set, reset, submit: () => void submit(), isSending, problem };
}
