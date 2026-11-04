/**
 * A space's welcome note (bundle 14d IDEAS-3, part d; idea IDEA-20261102-6): the owner writes a
 * short note that each new member sees once at the top of the space.
 *
 * Who calls it: hooks/useSpaceWelcome.ts. What it calls next: set_space_welcome_note() and
 * dismiss_space_welcome() in supabase/migrations/…_ideas3_d_joining_spaces.sql. The note itself
 * arrives with the space (space_page() → viewer.welcomeNote and viewer.showWelcome, read in
 * spaces.ts); the database checks the 500-character limit and refuses HTML.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceErrorFrom } from './spaces';

/** The longest welcome note, in characters (the setting space_welcome_max_characters). */
export const welcomeNoteMaxCharacters = 500;

/**
 * Saves the welcome note; an empty note takes it away.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param note - the words
 * @throws SpaceError when refused: not allowed, or 'invalid' with the field "welcome" (too long, HTML)
 */
export async function saveWelcomeNote(
  client: AppSupabaseClient,
  slug: string,
  note: string,
): Promise<void> {
  const { error } = await client.rpc('set_space_welcome_note', { slug, note });
  if (error) throw spaceErrorFrom(error);
}

/**
 * Says "Got it" to the welcome note, so it doesn't show again.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @throws SpaceError when refused (the caller isn't in the space)
 */
export async function dismissWelcomeNote(client: AppSupabaseClient, slug: string): Promise<void> {
  const { error } = await client.rpc('dismiss_space_welcome', { slug });
  if (error) throw spaceErrorFrom(error);
}
