/**
 * Staff › Waitlist, "Waiting for their country to open": how many "Tell me when you open here"
 * addresses wait for each closed country (bundle G5, part a; story S1-E2-10).
 *
 * Who calls it: components/waitlist/OpeningListCounts.tsx.
 * What it calls next: admin_opening_list_counts(), which refuses anyone but owner and admin in a
 * staff session and never returns an address (…_g5a_opening_list.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One country's numbers. */
export interface OpeningListCount {
  countryCode: string;
  confirmed: number;
  unconfirmed: number;
}

/**
 * Reads the counts, the most confirmed first.
 *
 * @param client - the signed-in staff member's Supabase client
 * @returns the counts by country
 * @throws the database's error (insufficient_privilege for anyone but owner and admin)
 */
export async function fetchOpeningListCounts(
  client: AppSupabaseClient,
): Promise<OpeningListCount[]> {
  const { data, error } = await client.rpc('admin_opening_list_counts');
  if (error !== null) throw error;
  return data.map((row) => ({
    countryCode: row.country_code,
    confirmed: row.confirmed,
    unconfirmed: row.unconfirmed,
  }));
}
