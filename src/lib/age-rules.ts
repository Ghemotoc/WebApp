/**
 * The age rules by country, as the browser applies them before anything is sent (bundle MARKETS-1,
 * stories S1-E2-20 to S1-E2-22).
 *
 * Who uses it: the sign-up form (src/features/auth/), the country setting (src/features/settings/)
 * and the staff Age rules page (src/features/staff/). The rows come from public.country_age_rules
 * (features/auth/api/ageRules.ts). The database is the authority: age_rule_for() and
 * age_rule_outcome() (…_markets1_01_country_age_rules.sql) apply the same rules again, and
 * age-rules.test.ts uses the same examples as pgTAP 308.
 *
 * Rules (Robert, 6 Nov 2026; research H1 refresh): a region with its own law (Quebec, Florida …)
 * wins over its country; a country without a row gets the strictest default, "ZZ" (13 to join,
 * a parent's consent under 16). The person counts as the younger possible age (src/lib/age.ts).
 */
import { youngestPossibleAge, type CalendarDate } from './age';

/** The code of the default rule, used for any country without its own row. */
export const defaultRuleCountry = 'ZZ';

/** One country's (or region's) ages, as the database stores them. */
export interface AgeRule {
  id: string;
  countryCode: string;
  /** '' for the whole country; a region code (QC, FL) for a region with its own law. */
  regionCode: string;
  name: string;
  regionName: string;
  /** The youngest age that may join at all. */
  minimumAge: number;
  /** Below this age a parent's or guardian's consent is needed. */
  parentalConsentBelow: number;
  /** Below this age sign-up is blocked even with a parent's consent (Australia 16), or null. */
  signupBlockedBelow: number | null;
  legalBasis: string;
  source: string;
  /** The day the rule was last checked, as YYYY-MM-DD. */
  dateChecked: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'to_verify' | 'verified';
  notes: string;
}

/** What the rule says about someone: as age_rule_outcome() in the database. */
export type AgeRuleOutcome = 'ok' | 'consent_needed' | 'under_minimum' | 'blocked' | 'unknown';

/**
 * The rule that applies where someone lives.
 *
 * @param rules - every rule
 * @param countryCode - the two-letter country, or null when unknown
 * @param regionCode - the region with its own law, or ''
 * @returns the region's rule, else the country's, else the default; undefined only while the
 *   rules haven't loaded
 */
export function ruleFor(
  rules: readonly AgeRule[],
  countryCode: string | null,
  regionCode = '',
): AgeRule | undefined {
  // Step 1: a region's own law wins (Quebec over Canada).
  const regional = rules.find(
    (rule) =>
      rule.countryCode === countryCode && regionCode !== '' && rule.regionCode === regionCode,
  );
  if (regional !== undefined) return regional;
  // Step 2: the country's rule, else the strictest default.
  const national = rules.find((rule) => rule.countryCode === countryCode && rule.regionCode === '');
  return national ?? rules.find((rule) => rule.countryCode === defaultRuleCountry);
}

/**
 * What a rule says about a year (and month) of birth.
 *
 * @param rule - the rule where the person lives
 * @param birthYear - the year, or null
 * @param birthMonth - the month, or null when only the year is known
 * @param today - today's Romanian date
 * @returns the outcome; 'unknown' without a year or a rule
 */
export function ageRuleOutcome(
  rule: AgeRule | undefined,
  birthYear: number | null,
  birthMonth: number | null,
  today: CalendarDate,
): AgeRuleOutcome {
  if (rule === undefined || birthYear === null) return 'unknown';
  const age = youngestPossibleAge(birthYear, birthMonth, today);
  if (rule.signupBlockedBelow !== null && age < rule.signupBlockedBelow) return 'blocked';
  if (age < rule.minimumAge) return 'under_minimum';
  if (age < rule.parentalConsentBelow) return 'consent_needed';
  return 'ok';
}

/**
 * The age below which someone can't join at all in this place: the block age when there is
 * one, else the minimum age. The refusal names it ("isn't open to under-16s in Australia").
 *
 * @param rule - the rule
 * @returns the age
 */
export function joiningAge(rule: AgeRule): number {
  return Math.max(rule.minimumAge, rule.signupBlockedBelow ?? 0);
}

/**
 * Whether the year leaves the age unclear at one of this rule's own ages, so the month is asked
 * too (as birth_year_needs_month_where() in the database).
 *
 * @param rule - the rule, or undefined while loading
 * @param birthYear - the year chosen
 * @param today - today's Romanian date
 * @returns true when the person turns one of the rule's ages this year
 */
export function ruleNeedsMonth(
  rule: AgeRule | undefined,
  birthYear: number,
  today: CalendarDate,
): boolean {
  if (rule === undefined) return false;
  const ageThisYear = today.year - birthYear;
  const ages = [rule.minimumAge, rule.parentalConsentBelow, rule.signupBlockedBelow];
  return ages.includes(ageThisYear);
}

/**
 * Whether staff should look at a rule again: low confidence, or not checked for six months (as
 * age_rule_needs_review() in the database).
 *
 * @param rule - the rule
 * @param today - today, as a Date
 * @returns true when it needs another look
 */
export function ruleNeedsReview(rule: AgeRule, today: Date = new Date()): boolean {
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return rule.confidence === 'low' || new Date(rule.dateChecked) < sixMonthsAgo;
}

/**
 * The place a rule covers, in words: "Canada: Quebec", "Romania", or the default's own words.
 *
 * @param rule - the rule
 * @param language - the reader's language
 * @param defaultName - the words for the default rule ("Any other country")
 * @returns the name
 */
export function placeName(rule: AgeRule, language: string, defaultName: string): string {
  if (rule.countryCode === defaultRuleCountry) return defaultName;
  let country = rule.name;
  try {
    // The browser's own name in the reader's language, else the name staff typed.
    country =
      new Intl.DisplayNames([language], { type: 'region' }).of(rule.countryCode) ?? rule.name;
  } catch {
    // An unknown code keeps the typed name.
  }
  return rule.regionCode === '' ? country : `${country}: ${rule.regionName || rule.regionCode}`;
}
