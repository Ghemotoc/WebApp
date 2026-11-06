/**
 * Staff › Settings › Age rules by country: saving one rule (bundle MARKETS-1, story S1-E2-21).
 *
 * Who calls it: hooks/useAgeRulesAdmin.ts. Reading uses the public read of the rules
 * (features/auth/api/ageRules.ts), because the privacy notice publishes them anyway.
 * What it calls next: admin_save_age_rule() (…_markets1_03_country_at_sign_up_and_gate.sql),
 * which allows only the owner and admins in a staff session, needs a reason, writes the audit log
 * with the values before and after, and gives members the change newly asks for a parent's
 * consent 14 days to ask (S1-E2-22).
 */
import type { AgeRule } from '@/lib/age-rules';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { settingsErrorFrom } from './settingsAdmin';

/** The fields of a rule staff can write: everything but its ID. */
export type AgeRuleDraft = Omit<AgeRule, 'id'>;

/**
 * A rule in the database's names, for admin_save_age_rule().
 *
 * @param rule - the rule as the form holds it
 * @returns the JSON the function reads
 */
export function ageRuleToJson(rule: AgeRuleDraft): Json {
  return {
    country_code: rule.countryCode,
    region_code: rule.regionCode,
    name: rule.name,
    region_name: rule.regionName,
    minimum_age: rule.minimumAge,
    parental_consent_below: rule.parentalConsentBelow,
    signup_blocked_below: rule.signupBlockedBelow,
    legal_basis: rule.legalBasis,
    source: rule.source,
    date_checked: rule.dateChecked,
    confidence: rule.confidence,
    status: rule.status,
    notes: rule.notes,
  };
}

/**
 * Saves a rule, new or changed.
 *
 * @param client - the shared Supabase client
 * @param rule - the rule
 * @param reason - why it changes, for the audit log
 * @returns the rule's ID
 * Errors: throws SettingsAdminError: not_allowed for anyone but the owner and admins, invalid with
 *   the reason word reason_needed without a reason, or invalid for ages out of range.
 */
export async function saveAgeRule(
  client: AppSupabaseClient,
  rule: AgeRuleDraft,
  reason: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_age_rule', {
    rule: ageRuleToJson(rule),
    reason,
  });
  if (error !== null) throw settingsErrorFrom(error);
  return data;
}
