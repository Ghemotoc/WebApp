/**
 * The band colour an admin chose for a genre or tag page (bundle G12b; Staff › Website › Genre
 * and tag pages).
 *
 * Who calls it: hooks/useListPageBackground.ts, for StoryListHeader.
 * What it calls next: list_page_background(), which anyone may call: it returns only the colour
 * name for the visitor's market (or for every market), never who chose it.
 */
import type { PillTone } from '@/components/ui/InfoPill';
import { getSupabaseClient } from '@/lib/supabase';

/** The six band colours the database allows, the same as the pill tones. */
const bandTones: readonly PillTone[] = ['plum', 'sage', 'gold', 'sky', 'blush', 'neutral'];

/**
 * Reads the chosen band colour of a genre or tag page.
 *
 * @param listKind - 'category' or 'tag'
 * @param listKey - the slug or tag from the page address
 * @param country - the visitor's country code, or null when unknown
 * @returns the colour, or null when no admin chose one (or the read failed: the page then keeps
 *   its default band, which is never wrong, only plainer)
 */
export async function fetchListPageBackground(
  listKind: 'category' | 'tag',
  listKey: string,
  country: string | null,
): Promise<PillTone | null> {
  const client = await getSupabaseClient();
  if (client === null) return null;
  const { data, error } = await client.rpc('list_page_background', {
    list_kind: listKind,
    list_key: listKey,
    visitor_country: country ?? '',
  });
  if (error !== null) return null;
  return bandTones.find((tone) => tone === data) ?? null;
}
