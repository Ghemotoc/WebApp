/**
 * useEditionDetails: the title and description of one language of a story, and the removal of
 * that language (bundle TRANSLATE-1c; Robert, 16 Nov 2026).
 *
 * Who calls it: EditionDetailsForm and RemoveLanguageCard.
 * What it calls: api/storyLanguages.ts → update_story_language(), and the writing feature's
 * deleteMyStory() (delete_my_story() on a later edition removes that language only; it can be
 * brought back for 30 days like any deleted story, S1-E3-05).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { deleteMyStory } from '@/features/writing/api/stories';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import { updateStoryLanguage, type StoryLanguage } from '../api/storyLanguages';

import { storyLanguagesKey } from './useStoryLanguages';

/** Where the form stands, as a key under "details" in the storyLanguages texts (or null). */
export type DetailsMessage = 'saved' | 'titleMissing' | 'failed';

/**
 * Runs the "Title and description" form of one language.
 *
 * @param edition - the language being edited
 * @returns title, blurb, their setters, save(), isSaving and the message (or null)
 */
export function useEditionDetails(edition: StoryLanguage) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(edition.title);
  const [blurb, setBlurb] = useState(edition.blurb);
  const [message, setMessage] = useState<DetailsMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /** Checks the title, saves both, and refreshes the Languages table. */
  async function save() {
    // Step 1: a story always has a title, in every language.
    if (title.trim() === '') return setMessage('titleMissing');
    setIsSaving(true);
    try {
      // Step 2: the database saves the words on this edition only.
      const words = { title: title.trim(), blurb: blurb.trim() };
      const outcome = await updateStoryLanguage(await requireClient(), edition.slug, words);
      // Step 3: the table and the breadcrumb read the new title.
      if (outcome === 'ok') {
        await queryClient.invalidateQueries({ queryKey: storyLanguagesKey(userId, edition.slug) });
      }
      setMessage(outcome === 'ok' ? 'saved' : 'failed');
    } catch {
      // The database refused the words or couldn't be reached: one plain message, try again.
      setMessage('failed');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    title,
    blurb,
    setTitle: (value: string) => {
      setTitle(value.slice(0, MAXIMUM_TITLE_LENGTH));
      setMessage(null);
    },
    setBlurb: (value: string) => {
      setBlurb(value.slice(0, MAXIMUM_BLURB_LENGTH));
      setMessage(null);
    },
    save: () => void save(),
    isSaving,
    message,
  };
}

/**
 * Removes one language of a story, after the writer confirmed.
 *
 * @param editionSlug - that language's story address
 * @param firstEditionSlug - the original's address, whose Languages page opens afterwards
 * @returns remove(), isRemoving and failed
 */
export function useRemoveLanguage(editionSlug: string, firstEditionSlug: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRemoving, setIsRemoving] = useState(false);
  const [failed, setFailed] = useState(false);

  /** Deletes the edition, then goes back to the story's languages. */
  async function remove() {
    setIsRemoving(true);
    setFailed(false);
    try {
      // Step 1: delete_my_story() on a later edition removes that language and its chapters.
      const outcome = await deleteMyStory(await requireClient(), editionSlug);
      if (outcome !== 'ok') return setFailed(true);
      // Step 2: every list that showed the language reads again (languages, the Write page).
      await queryClient.invalidateQueries();
      await navigate(`/write/s/${firstEditionSlug}/languages`);
    } catch {
      // The database couldn't be reached: say so; nothing was removed.
      setFailed(true);
    } finally {
      setIsRemoving(false);
    }
  }

  return { remove: () => void remove(), isRemoving, failed };
}
