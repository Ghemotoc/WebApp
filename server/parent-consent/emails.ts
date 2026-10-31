/**
 * The parental consent emails (story S1-E2-03; ADR 0011): the request to a parent or guardian,
 * the confirmation after a yes (with the link to withdraw later), the confirmation after a
 * withdrawal, and the email that tells a writer their parent said no.
 *
 * The words are the "parentConsent" group of email.json, ro and en, with the admins' wording laid
 * over them ("email:parentConsent.*" overrides, S1-E11-19). Placeholders such as {{handle}} and
 * {{link}} are locked in the admin editor, so an edit can't break an email.
 * Who calls it: server/parent-consent.ts. What it calls: textOf() from server/send-email.ts.
 */
import englishEmail from '../../src/locales/en/email.json';
import romanianEmail from '../../src/locales/ro/email.json';
import type { ConsentLanguage } from '../../src/schemas/parentConsent';
import type { OutgoingEmail } from '../contact';
import { textOf } from '../send-email';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts. */
const defaultTexts: Record<ConsentLanguage, EmailTexts> = { ro: romanianEmail, en: englishEmail };

/** Which email, and the values its placeholders take. */
export type ConsentEmailKind = 'request' | 'agreed' | 'withdrawn' | 'refused';

/** The lines of each email, after the subject, as email.json names them. */
const bodyLines: Record<ConsentEmailKind, string[]> = {
  request: ['requestBody', 'requestAction', 'requestDeadline'],
  agreed: ['agreedBody', 'agreedWithdraw'],
  withdrawn: ['withdrawnBody'],
  refused: ['refusedBody'],
};

/** What every email needs to be written. */
export interface ConsentEmailContext {
  language: ConsentLanguage;
  overrides: Map<string, string>;
  productName: string;
  companyName: string;
}

/**
 * Fills {{handle}}, {{link}}, {{deadline}} and {{date}} in one text.
 *
 * @returns the text with every known placeholder filled
 */
function fill(text: string, values: Record<string, string>): string {
  let filled = text;
  for (const [name, value] of Object.entries(values)) {
    filled = filled.split(`{{${name}}}`).join(value);
  }
  return filled;
}

/**
 * A day in Romania's time, written for the reader ("30 October 2026", "30 octombrie 2026").
 *
 * @param moment - an ISO time
 * @param language - the reader's language
 * @returns the date
 */
export function consentDate(moment: string, language: ConsentLanguage): string {
  return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(moment));
}

/**
 * Writes one consent email as plain text.
 *
 * @param kind - which email
 * @param to - the address
 * @param values - the placeholders' values (handle, link, deadline, date)
 * @param context - the language, the admins' wording and the names
 * @returns the email, ready to send
 */
export function consentEmail(
  kind: ConsentEmailKind,
  to: string,
  values: Record<string, string>,
  context: ConsentEmailContext,
): OutgoingEmail {
  const names = { productName: context.productName, companyName: context.companyName };
  // Step 1: each text with the admins' wording when there is one, then the placeholders.
  const read = (path: string) =>
    fill(textOf(defaultTexts[context.language], context.overrides, path, names), values);
  // Step 2: the lines, separated by a blank line, then the sign-off.
  const lines = bodyLines[kind].map((line) => read(`parentConsent.${line}`));
  const text = [...lines, read('signOff'), read('madeBy')].join('\n\n');
  return { to, subject: read(`parentConsent.${kind}Subject`), text };
}
