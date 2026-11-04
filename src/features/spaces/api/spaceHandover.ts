/**
 * Handing a space over to one of its moderators (bundle 14d IDEAS-3, part e; idea
 * IDEA-20261102-7): the owner offers it, may take the offer back, and the moderator accepts or
 * declines. Accepting makes them the owner and the old owner a moderator with every power.
 *
 * Who calls it: hooks/useSpaceHandover.ts. What it calls next: offer_space_handover(),
 * cancel_space_handover() and answer_space_handover() in
 * supabase/migrations/…_ideas3_e_space_handover.sql. The open offer itself arrives with the space
 * (space_page() → viewer.handover, read in spaces.ts). Refusals become SpaceError.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceErrorFrom } from './spaces';

/**
 * Offers the space to one of its moderators.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param handle - the moderator's username
 * @throws SpaceError when refused: not the owner, or a person who can't take it over
 *   (handover_not_moderator, handover_age, handover_not_teacher)
 */
export async function offerHandover(
  client: AppSupabaseClient,
  slug: string,
  handle: string,
): Promise<void> {
  const { error } = await client.rpc('offer_space_handover', { slug, handle });
  if (error) throw spaceErrorFrom(error);
}

/**
 * Takes an open offer back.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @throws SpaceError when refused (not the owner)
 */
export async function cancelHandover(client: AppSupabaseClient, slug: string): Promise<void> {
  const { error } = await client.rpc('cancel_space_handover', { slug });
  if (error) throw spaceErrorFrom(error);
}

/**
 * Accepts or declines an offer to take the space over.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param accept - true to become the owner
 * @throws SpaceError when refused: the offer is gone (handover_missing), or the reader may no
 *   longer take it over
 */
export async function answerHandover(
  client: AppSupabaseClient,
  slug: string,
  accept: boolean,
): Promise<void> {
  const { error } = await client.rpc('answer_space_handover', { slug, accept });
  if (error) throw spaceErrorFrom(error);
}
