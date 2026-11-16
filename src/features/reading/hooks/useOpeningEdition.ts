/**
 * useOpeningEdition: sends a reader to the language a story should open in (bundle TRANSLATE-1b;
 * handoff "Opening language"; Robert, 16 Nov 2026).
 *
 * The order: the language this reader chose for the story before (lib/rememberedEdition.ts);
 * otherwise the database's pick, story_opening_edition(): the page's language, then a language
 * the reader reads, then the first edition. When that is another edition than the address asked
 * for, the page moves there (replacing the address, so Back still leaves the story).
 * The writer stays where they are: they open each of their own editions on purpose.
 * A story in one language has no editions, so nothing is asked and nothing moves.
 *
 * Who calls it: StoryPage. What it calls: api/editions.ts → story_opening_edition(); the router.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchOpeningEdition } from '../api/editions';
import type { StoryPageData } from '../api/storyPage';
import { readRememberedEdition } from '../lib/rememberedEdition';

/**
 * The language remembered for this story, when the story has an edition in it.
 *
 * @param story - the story page on screen
 * @returns that edition's address, or null when nothing (or nothing usable) is remembered
 */
function rememberedAddress(story: StoryPageData): string | null {
  const firstEdition = story.editions[0];
  if (firstEdition === undefined) return null;
  const language = readRememberedEdition(firstEdition.slug);
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
 * Moves to the edition this reader should see, when it isn't the one on screen.
 *
 * @param story - the story page on screen, or null while it loads
 */
export function useOpeningEdition(story: StoryPageData | null): void {
  const navigate = useNavigate();
  const currentSlug = story?.slug ?? '';
  // Step 1: only a reader of a story in several languages needs an answer.
  const hasChoice = story !== null && story.editions.length > 1 && !story.isOwner;
  const remembered = hasChoice ? rememberedAddress(story) : null;
  // Step 2: with nothing remembered, ask the database.
  const picked = useDatabasePick(currentSlug, hasChoice && remembered === null);
  const target = remembered ?? picked;
  // Step 3: move there, keeping Back pointed at wherever the reader came from.
  useEffect(() => {
    if (!hasChoice || target === null || target === currentSlug) return;
    void navigate(`/s/${target}`, { replace: true });
  }, [hasChoice, target, currentSlug, navigate]);
}
