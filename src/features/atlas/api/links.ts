/**
 * Reads what [[Name]] links can point to, and where a character is mentioned (stories S1-E17-31
 * and S1-E17-12; bundle ATLAS, part h).
 *
 * Who calls it: hooks/useLinkTargets.ts and hooks/useCharacterMentions.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_30_search_and_links.sql):
 * story_link_targets() and character_mentions(). Only the writer reads either.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { AtlasItemReference } from '../lib/itemAddress';

import { checkedAnswer } from './checkedAnswer';

/** Something a [[Name]] can point to: a character, a bible entry or a chapter. */
export interface LinkTarget {
  kind: 'character' | 'entry' | 'chapter';
  /** The ID, or the chapter's code. */
  ref: string;
  title: string;
  /** Every name it answers to: a character's name and aliases, else the title. */
  names: string[];
}

/** The cache key of a story's link targets. */
export const linkTargetsQueryKey = (userId: string | null, slug: string) => [
  'atlas-link-targets',
  userId,
  slug,
];

/**
 * Reads a story's link targets.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the targets, characters first; [] when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchLinkTargets(
  client: AppSupabaseClient,
  slug: string,
): Promise<LinkTarget[]> {
  const answer = await client.rpc('story_link_targets', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the links', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return [];
  return data.targets as unknown as LinkTarget[];
}

/** One place a character is mentioned, with its title. */
export interface CharacterMention extends AtlasItemReference {
  title: string;
}

/** The cache key of a character's mentions. */
export const characterMentionsQueryKey = (userId: string | null, characterId: string) => [
  'atlas-character-mentions',
  userId,
  characterId,
];

/**
 * Reads where a character is mentioned with [[their name]] or an alias (S1-E17-12).
 *
 * @param characterId - the character's ID
 * @returns the places, grouped by kind; [] when the character isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchCharacterMentions(
  client: AppSupabaseClient,
  characterId: string,
): Promise<CharacterMention[]> {
  const answer = await client.rpc('character_mentions', { character_id: characterId });
  const data = checkedAnswer(answer, 'read the mentions', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return [];
  return data.items as unknown as CharacterMention[];
}
