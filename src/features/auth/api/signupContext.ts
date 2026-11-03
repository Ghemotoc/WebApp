/**
 * Reads the sign-up context (the country of the connection and its signed token) and the markets
 * (story S1-E2-10).
 *
 * Who calls it: hooks/useSignUpMarket.ts.
 * What it calls next: our own /api/signup-context (a Cloudflare Pages Function, served locally by
 * server/pages-functions-plugin.ts), and public.markets through markets_select_public.
 * The country is only used to choose what the form says; the sign-up trigger checks the token
 * itself and applies the market rules (…_s1_e2_10_country.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The country of the connection and the token for the sign-up. */
export interface SignupCountry {
  country: string | null;
  token: string | null;
  /**
   * The visitor's IP address scrambled and signed (bundle ADMIN-2, part f2), or null. The form
   * passes it on untouched; only the database reads it.
   */
  ipToken: string | null;
}

/** One market: whether it is open and its minimum age. */
export interface Market {
  countryCode: string;
  isOpen: boolean;
  minimumAge: number;
}

/**
 * Asks our Pages Function for the country of this connection.
 *
 * @returns the country and token; both null when the function can't be reached (the country then
 *   counts as unknown, which the invited test still admits)
 */
export async function fetchSignupCountry(): Promise<SignupCountry> {
  try {
    const response = await fetch('/api/signup-context', { cache: 'no-store' });
    if (!response.ok) return { country: null, token: null, ipToken: null };
    const body = (await response.json()) as Partial<SignupCountry>;
    return {
      country: typeof body.country === 'string' ? body.country : null,
      token: typeof body.token === 'string' ? body.token : null,
      ipToken: typeof body.ipToken === 'string' ? body.ipToken : null,
    };
  } catch {
    return { country: null, token: null, ipToken: null };
  }
}

/**
 * Reads every market.
 *
 * @param client - the shared Supabase client
 * @returns the markets
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMarkets(client: AppSupabaseClient): Promise<Market[]> {
  const { data, error } = await client.from('markets').select('country_code, is_open, minimum_age');
  if (error !== null) throw new Error(`Could not read the markets: ${error.message}`);
  return data.map((market) => ({
    countryCode: market.country_code,
    isOpen: market.is_open,
    minimumAge: market.minimum_age,
  }));
}
