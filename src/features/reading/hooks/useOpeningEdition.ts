/**
 * useOpeningEdition: sends a reader to the language a story should open in (bundle TRANSLATE-1b;
 * handoff "Opening language"; Robert, 16 Nov 2026).
 *
 * The order: the language this reader chose for the story before, from the account when signed
 * in (remembered_places, design books item 17) or this browser (lib/rememberedEdition.ts);
 * otherwise the database's pick, story_opening_edition(): the page's language, then a language
 * the reader reads, then the first edition. When that is another edition than the address asked
 * for, the page moves there (replacing the address, so Back still leaves the story).
 * The writer stays where they are: they open each of their own editions on purpose.
 * A story in one language has no editions, so nothing is asked and nothing moves.
 *
 * Who calls it: StoryPage. What it calls: api/editions.ts → story_opening_edition();
 * useRememberedPlace; the router.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import type { Json } from '@/lib/database.types';
import { useRememberedPlace } from '@/lib/remembered/useRememberedPlace';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchOpeningEdition } from '../api/editions';
import type { StoryPageData } from '../api/storyPage';
import { readRememberedEdition } from '../lib/rememberedEdition';

/** The language code in an account place ({ languageCode }), or null. */
function languageInPlace(place: Json | null): string | null {
  if (place === null || typeof place !== 'object' || Array.isArray(place)) return null;
  const language = place.languageCode;
  return typeof language === 'string' ? language : null;
}

/**
 * The language remembered for this story, when the story has an edition in it.
 *
 * @param story - the story page on screen
 * @param accountLanguage - the account's choice for a signed-in reader, or null
 * @returns that edition's address, or null when nothing (or nothing usable) is remembered
 */
function rememberedAddress(story: StoryPageData, accountLanguage: string | null): string | null {
  const firstEdition = story.editions[0];
  if (firstEdition === undefined) return null;
  // The account wins: it is the same on every device; this browser's choice is the fallback.
  const language = accountLanguage ?? readRememberedEdition(firstEdition.slug);
  if (language === null) return null;
  return story.editions.find((edition) => edition.languageCode === language)?.slug ?? null;
}

/**
 * The database's pick for a story: the page's language, a language the reader reads, then the
 * first edition. Asked once per story and page language.
 *
 * @param storySlug - the story on screen
 * @param isNeeded - false when there is nothing to ask (one language, the writer, a remembered
 *   choice)
 * @returns the address of the edition to open, or null while unknown
 */
function useDatabasePick(storySlug: string, isNeeded: boolean): string | null {
  const { i18n } = useTranslation();
  const opening = useQuery({
    queryKey: ['story-opening-edition', storySlug, i18n.language],
    enabled: isNeeded && storySlug !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchOpeningEdition(client, storySlug);
    },
  });
  return opening.data?.slug ?? null;
}

/**
 * The edition remembered for a story: the account's choice when signed in, else this browser's.
 *
 * @param story - the story page, or null when there is no choice to make
 * @returns remembered (an edition's address, or null) and isSettled (the account has answered)
 */
function useRememberedEdition(story: StoryPageData | null) {
  const firstEditionSlug = story?.editions[0]?.slug ?? null;
  const account = useRememberedPlace('story_edition', firstEditionSlug);
  const remembered =
    story === null ? null : rememberedAddress(story, languageInPlace(account.place));
  return { remembered, isSettled: account.isSettled };
}

/**
 * Moves to the edition this reader should see, when it isn't the one on screen.
 *
 * @param story - the story page on screen, or null while it loads
 */
export function useOpeningEdition(story: StoryPageData | null): void {
  const navigate = useNavigate();
  const currentSlug = story?.slug ?? '';
  // Step 1: only a reader of a story in several languages needs an answer.
  const hasChoice = story !== null && story.editions.length > 1 && !story.isOwner;
  // Step 2: the choice remembered for the story; a signed-in reader's account answers first.
  const { remembered, isSettled } = useRememberedEdition(hasChoice ? story : null);
  // Step 3: with nothing remembered, ask the database (only once the account has answered).
  const picked = useDatabasePick(currentSlug, hasChoice && isSettled && remembered === null);
  const target = isSettled ? (remembered ?? picked) : null;
  // Step 4: move there, keeping Back pointed at wherever the reader came from.
  useEffect(() => {
    if (!hasChoice || target === null || target === currentSlug) return;
    void navigate(`/s/${target}`, { replace: true });
  }, [hasChoice, target, currentSlug, navigate]);
}
