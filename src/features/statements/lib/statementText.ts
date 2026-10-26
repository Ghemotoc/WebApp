/**
 * The words of a statement of reasons that depend on its contents: what we did (with the end
 * date of a timed restriction), the rule and how it was found (story S1-E10-04; DSA art. 17(3)).
 *
 * Who calls it: StatementCard, here and on the staff case page (the stored statement). Kept out
 * of the component so it can be tested on its own and stays short.
 */
import type { TFunction } from 'i18next';

import type { StatementOfReasons } from '../api/statements';

/**
 * A date as people read it, in Romania's time zone.
 *
 * @param isoTime - the database's time
 * @param language - the page's language
 * @returns for example "14 April 2027"
 */
export function readableDate(isoTime: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'long',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(isoTime));
}

/**
 * "What we did": the action in plain words; a suspension or a reporting pause names its end.
 *
 * @param statement - the statement
 * @param t - the statements translator
 * @param language - the page's language
 * @returns the sentence
 */
export function whatWeDidText(
  statement: StatementOfReasons,
  t: TFunction<'statements'>,
  language: string,
): string {
  const isTimed = statement.action === 'suspend' || statement.action === 'reporting_pause';
  if (!isTimed) return t(`decisions.did.${statement.action}`);
  if (statement.restrictionEndsAt === null) return t(`decisions.did.${statement.action}NoDate`);
  return t(`decisions.did.${statement.action}`, {
    date: readableDate(statement.restrictionEndsAt, language),
  });
}

/**
 * "The rule": our community guidelines or the law, with the rule's name.
 *
 * @param statement - the statement
 * @param t - the statements translator
 * @returns the sentence
 */
export function ruleText(statement: StatementOfReasons, t: TFunction<'statements'>): string {
  const rule = t(`decisions.rules.${statement.groundKey}`, {
    defaultValue: t('decisions.rules.community_rules'),
  });
  return t(statement.ground === 'law' ? 'decisions.ruleLaw' : 'decisions.ruleTerms', { rule });
}

/**
 * "How we found it": a person or the automatic picture check found it; a person always decided.
 *
 * @param statement - the statement
 * @param t - the statements translator
 * @returns the sentence
 */
export function howFoundText(statement: StatementOfReasons, t: TFunction<'statements'>): string {
  return t(
    statement.automatedDetection ? 'decisions.foundAutomatically' : 'decisions.foundByPerson',
  );
}
