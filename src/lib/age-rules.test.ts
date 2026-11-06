/**
 * Tests for the age rules by country in the browser (bundle MARKETS-1). The same examples as
 * pgTAP 308, so the form and the database agree.
 */
import { describe, expect, it } from 'vitest';

import {
  ageRuleOutcome,
  joiningAge,
  ruleFor,
  ruleNeedsMonth,
  ruleNeedsReview,
  type AgeRule,
} from './age-rules';

/**
 * A rule with the fields the tests don't care about filled in.
 *
 * @param countryCode - the country
 * @param regionCode - '' for the whole country, or the region with its own law
 * @param ages - the minimum age, the consent age and, when there is one, the block age
 */
function rule(
  countryCode: string,
  regionCode: string,
  [minimumAge, parentalConsentBelow, signupBlockedBelow]: [number, number, number?],
): AgeRule {
  return {
    id: `${countryCode}-${regionCode}`,
    countryCode,
    regionCode,
    name: countryCode,
    regionName: regionCode,
    minimumAge,
    parentalConsentBelow,
    signupBlockedBelow: signupBlockedBelow ?? null,
    legalBasis: '',
    source: '',
    dateChecked: '2026-11-06',
    confidence: 'high',
    status: 'to_verify',
    notes: '',
  };
}

const rules: AgeRule[] = [
  rule('ZZ', '', [13, 16]),
  rule('RO', '', [13, 16]),
  rule('GB', '', [13, 13]),
  rule('CA', '', [13, 13]),
  rule('CA', 'QC', [13, 14]),
  rule('AU', '', [13, 15, 16]),
];
const today = { year: 2026, month: 11 };
/** Born in 2011: 14 by the year alone, in 2026. */
const fourteen = 2011;
/** The rules the tests below pick out by name, so each one is a defined value. */
const romania = rule('RO', '', [13, 16]);
const britain = rule('GB', '', [13, 13]);
const australia = rule('AU', '', [13, 15, 16]);

describe('the age rules by country', () => {
  it('a region with its own law wins over its country', () => {
    expect(ruleFor(rules, 'CA', 'QC')?.parentalConsentBelow).toBe(14);
    expect(ruleFor(rules, 'CA', 'ON')?.parentalConsentBelow).toBe(13);
  });

  it('a country without its own rule gets the strictest default', () => {
    expect(ruleFor(rules, 'BR')?.countryCode).toBe('ZZ');
    expect(ruleFor(rules, null)?.countryCode).toBe('ZZ');
  });

  it('a 14-year-old is fine in the UK and Quebec, needs a parent in Romania, blocked in Australia', () => {
    const places: Array<[string, string]> = [
      ['GB', ''],
      ['CA', 'QC'],
      ['RO', ''],
      ['AU', ''],
    ];
    const outcomes = places.map(([country, region]) =>
      ageRuleOutcome(ruleFor(rules, country, region), fourteen, null, today),
    );
    expect(outcomes).toEqual(['ok', 'ok', 'consent_needed', 'blocked']);
  });

  it('a 12-year-old is under the minimum, and an unknown year is unknown', () => {
    expect(ageRuleOutcome(ruleFor(rules, 'GB'), 2013, null, today)).toBe('under_minimum');
    expect(ageRuleOutcome(ruleFor(rules, 'GB'), null, null, today)).toBe('unknown');
  });

  it('the refusal names the age below which nobody may join', () => {
    expect(joiningAge(australia)).toBe(16);
    expect(joiningAge(britain)).toBe(13);
  });

  it('the month is asked at a place’s own ages, such as 14 in Quebec', () => {
    expect(ruleNeedsMonth(ruleFor(rules, 'CA', 'QC'), 2012, today)).toBe(true);
    expect(ruleNeedsMonth(ruleFor(rules, 'RO'), 2012, today)).toBe(false);
  });

  it('a rule needs another look when its confidence is low or it is six months old', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(ruleNeedsReview(romania, now)).toBe(false);
    expect(ruleNeedsReview({ ...romania, confidence: 'low' }, now)).toBe(true);
    expect(ruleNeedsReview({ ...romania, dateChecked: '2026-04-01' }, now)).toBe(true);
  });
});
