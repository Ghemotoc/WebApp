/**
 * The two emails of a data request's parent path (bundle ADMIN-2, part c3; story S1-E11-09
 * criterion 5): "did you ask for this?" with the check link, and the one-time link to the copy.
 *
 * The words are the "dataRequestParent" group of email.json, ro and en, with the admins' wording
 * laid over them ("email:dataRequestParent.*" overrides, S1-E11-19). Placeholders such as
 * {{handle}}, {{reference}}, {{link}} and {{date}} are locked in the admin editor.
 * Who calls it: server/data-request-parent.ts. What it calls: textOf() from server/send-email.ts.
 */
import englishEmail from '../../src/locales/en/email.json';
import romanianEmail from '../../src/locales/ro/email.json';
import type { OutgoingEmail } from '../contact';
import { textOf } from '../send-email';

/** The two languages a parent's email can be in (the language they agreed in, S1-E2-03). */
export type ParentEmailLanguage = 'ro' | 'en';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts. */
const defaultTexts: Record<ParentEmailLanguage, EmailTexts> = {
  ro: romanianEmail,
  en: englishEmail,
};

/** Which email: the identity check, or the copy. */
export type ParentEmailKind = 'ask' | 'copy';

/** The lines of each email, after the subject, as email.json names them. */
const bodyLines: Record<ParentEmailKind, string[]> = {
  ask: ['askBody', 'askAction', 'askNotYou'],
  copy: ['copyBody', 'copyAction', 'copyOnce'],
};

/** What every email needs to be written. */
export interface ParentEmailContext {
  language: ParentEmailLanguage;
  overrides: Map<string, string>;
  productName: string;
  companyName: string;
}

/**
 * Fills the placeholders in one text.
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
 * Writes one email to a parent as plain text.
 *
 * @param kind - which email
 * @param to - the parent's address from the parental consent
 * @param values - the placeholders' values (handle, reference, link, date)
 * @param context - the language, the admins' wording and the names
 * @returns the email, ready to send
 */
export function parentEmail(
  kind: ParentEmailKind,
  to: string,
  values: Record<string, string>,
  context: ParentEmailContext,
): OutgoingEmail {
  const names = { productName: context.productName, companyName: context.companyName };
  // Step 1: each text with the admins' wording when there is one, then the placeholders.
  const read = (path: string) =>
    fill(textOf(defaultTexts[context.language], context.overrides, path, names), values);
  // Step 2: the lines, separated by a blank line, then the sign-off.
  const lines = bodyLines[kind].map((line) => read(`dataRequestParent.${line}`));
  const text = [...lines, read('signOff'), read('madeBy')].join('\n\n');
  return { to, subject: read(`dataRequestParent.${kind}Subject`), text };
}
