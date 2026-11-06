/**
 * Saves the country the signed-in person lives in (bundle MARKETS-1, stories S1-E2-20 and
 * S1-E2-22).
 *
 * Who calls it: hooks/useMyCountry.ts (Settings › Account and the one-time question).
 * What it calls next: set_my_country() (…_markets1_03_country_at_sign_up_and_gate.sql), which
 * checks the new country's age rule before saving, refuses a country that doesn't allow someone
 * this young, and starts 14 days' grace when the new rule asks for a parent's consent.
 * Privacy: only the country (and a region with its own age law) is stored, never the IP address.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why a change didn't save. */
export type CountryChangeFailure = 'under_country_age' | 'unknown_country' | 'unreachable';

/** The error a refused change throws, with the reason. */
export class CountryChangeError extends Error {
  constructor(public readonly failure: CountryChangeFailure) {
    super(`The country was not saved: ${failure}`);
  }
}

/** What a saved change means for the person. */
export interface CountryChangeResult {
  /** The new country's rule asks for a parent's or guardian's yes that hasn't been given. */
  consentNeeded: boolean;
  /** Until when the person may keep writing while they ask, or null. */
  graceUntil: string | null;
}

/** What set_my_country() answers. */
interface SetMyCountryAnswer {
  consent_needed?: boolean;
  grace_until?: string | null;
}

/**
 * Saves the country (and region).
 *
 * @param client - the shared Supabase client
 * @param country - the two-letter code
 * @param region - a region with its own age law, or ''
 * @returns whether a parent's consent is now needed, and the grace
 * Errors: throws CountryChangeError('under_country_age') when the country doesn't allow someone
 *   this young (nothing is saved), 'unknown_country' for a code that isn't one, 'unreachable'
 *   otherwise.
 */
export async function saveMyCountry(
  client: AppSupabaseClient,
  country: string,
  region: string,
): Promise<CountryChangeResult> {
  const { data, error } = await client.rpc('set_my_country', {
    country_code: country,
    region_code: region,
  });
  if (error !== null) {
    // The database names the reason in the error's hint (check_violation).
    if (error.hint === 'under_country_age' || error.hint === 'unknown_country') {
      throw new CountryChangeError(error.hint);
    }
    throw new CountryChangeError('unreachable');
  }
  const answer = (data ?? {}) as SetMyCountryAnswer;
  return { consentNeeded: answer.consent_needed === true, graceUntil: answer.grace_until ?? null };
}
