/**
 * The age rule editor's values: a new rule's starting values, and the conversion between a rule
 * and the editor's text fields (bundle MARKETS-1, story S1-E2-21).
 *
 * Who uses it: AgeRuleEditor and AgeRulesSection ("Add a country or region" starts from
 * emptyAgeRule). The database checks the ages again when the rule is saved.
 */
import type { AgeRule } from '@/lib/age-rules';

/** A new rule's starting values: the strictest default ages, to verify. */
export const emptyAgeRule: AgeRule = {
  id: 'new',
  countryCode: '',
  regionCode: '',
  name: '',
  regionName: '',
  minimumAge: 13,
  parentalConsentBelow: 16,
  signupBlockedBelow: null,
  legalBasis: '',
  source: '',
  dateChecked: new Date().toISOString().slice(0, 10),
  confidence: 'medium',
  status: 'to_verify',
  notes: '',
};

/** The form's text fields, all as typed. */
export type EditorFields = Record<
  | 'countryCode'
  | 'regionCode'
  | 'name'
  | 'regionName'
  | 'minimumAge'
  | 'parentalConsentBelow'
  | 'signupBlockedBelow'
  | 'legalBasis'
  | 'source'
  | 'dateChecked'
  | 'confidence'
  | 'status'
  | 'notes'
  | 'reason',
  string
>;

/**
 * The rule as text fields.
 *
 * @param rule - the rule
 * @returns the fields
 */
export function fieldsOf(rule: AgeRule): EditorFields {
  return {
    ...rule,
    minimumAge: String(rule.minimumAge),
    parentalConsentBelow: String(rule.parentalConsentBelow),
    signupBlockedBelow: rule.signupBlockedBelow === null ? '' : String(rule.signupBlockedBelow),
    reason: '',
  };
}

/**
 * The fields as a rule to save; codes in capitals, a blank block age meaning never.
 *
 * @param fields - what the form holds
 * @returns the rule without its ID
 */
export function ruleOf(fields: EditorFields): Omit<AgeRule, 'id'> {
  return {
    countryCode: fields.countryCode.trim().toUpperCase(),
    regionCode: fields.regionCode.trim().toUpperCase(),
    name: fields.name.trim(),
    regionName: fields.regionName.trim(),
    minimumAge: Number(fields.minimumAge),
    parentalConsentBelow: Number(fields.parentalConsentBelow),
    signupBlockedBelow: fields.signupBlockedBelow === '' ? null : Number(fields.signupBlockedBelow),
    legalBasis: fields.legalBasis.trim(),
    source: fields.source.trim(),
    dateChecked: fields.dateChecked,
    confidence: fields.confidence as AgeRule['confidence'],
    status: fields.status as AgeRule['status'],
    notes: fields.notes.trim(),
  };
}
