/**
 * Reads the age rules by country (bundle MARKETS-1, stories S1-E2-20 to S1-E2-22).
 *
 * Who calls it: hooks/useAgeRules.ts (sign-up, the country setting, the privacy notice's ages
 * table) and the staff Age rules page.
 * What it calls next: public.country_age_rules through country_age_rules_select_public; anyone
 * may read the rules, because the privacy notice publishes them.
 */
import type { AgeRule } from '@/lib/age-rules';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

/**
 * Turns a database row into the browser's shape.
 *
 * @param row - one row of country_age_rules
 * @returns the rule
 */
export function ageRuleFromRow(row: Tables<'country_age_rules'>): AgeRule {
  return {
    id: row.id,
    countryCode: row.country_code,
    regionCode: row.region_code,
    name: row.name,
    regionName: row.region_name,
    minimumAge: row.minimum_age,
    parentalConsentBelow: row.parental_consent_below,
    signupBlockedBelow: row.signup_blocked_below,
    legalBasis: row.legal_basis,
    source: row.source,
    dateChecked: row.date_checked,
    confidence: row.confidence as AgeRule['confidence'],
    status: row.status as AgeRule['status'],
    notes: row.notes,
  };
}

/**
 * Reads every rule, by country then region.
 *
 * @param client - the shared Supabase client
 * @returns the rules
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchAgeRules(client: AppSupabaseClient): Promise<AgeRule[]> {
  const { data, error } = await client
    .from('country_age_rules')
    .select('*')
    .order('country_code')
    .order('region_code');
  if (error !== null) throw new Error(`Could not read the age rules: ${error.message}`);
  return data.map(ageRuleFromRow);
}
