/**
 * Fills a canned reply for one ticket (story S1-E11-13, part 13b; bundle ADMIN-2h3b; criterion 8:
 * "when staff insert one, then it fills in the user's name and language (English or Română)").
 *
 * Who calls it: components/CannedReplyPicker.tsx. What it calls: nothing. The words then sit in
 * the reply box for staff to edit; nothing is sent by inserting.
 */

/** The two languages a canned reply carries. */
export type CannedReplyLanguage = 'ro' | 'en';

/** The parts of a canned reply the fill needs. */
export interface CannedReplyWords {
  bodyRo: string;
  bodyEn: string;
}

/** What the fill needs to know about the ticket. */
export interface CannedReplyTicket {
  number: number;
  language: CannedReplyLanguage;
  /** The person's pen name or username; null for someone who wrote only by email. */
  displayName: string | null;
}

/**
 * Picks the reply's words in the ticket's language and fills in {{name}} and {{number}}.
 * An unknown placeholder is left as it is, so staff see it and fix it before sending.
 *
 * @param reply - the canned reply
 * @param ticket - the ticket's number, language and the person's name
 * @returns the words to put in the reply box
 */
export function fillCannedReply(reply: CannedReplyWords, ticket: CannedReplyTicket): string {
  // Step 1: the words in the language the person writes in.
  const words = ticket.language === 'en' ? reply.bodyEn : reply.bodyRo;
  // Step 2: the ticket's number; spaces inside the braces are allowed.
  const withNumber = words.replace(/\{\{\s*number\s*\}\}/g, String(ticket.number));
  // Step 3: their name. Someone who wrote only by email has none, so the placeholder goes
  // together with the comma or space before it: "Hi {{name}}," becomes "Hi,", which reads
  // naturally in both languages without a made-up greeting.
  if (ticket.displayName === null) return withNumber.replace(/[,\s]*\{\{\s*name\s*\}\}/g, '');
  return withNumber.replace(/\{\{\s*name\s*\}\}/g, ticket.displayName);
}

/**
 * Puts inserted words into the reply box: they replace an empty box, or follow what is already
 * written after a blank line, so nothing staff typed is lost.
 *
 * @param current - what the box holds now
 * @param inserted - the filled canned reply
 * @returns the box's new contents
 */
export function withInsertedText(current: string, inserted: string): string {
  if (current.trim() === '') return inserted;
  return `${current.trimEnd()}\n\n${inserted}`;
}

/**
 * The placeholders as words, for help text that names them: i18next would otherwise read
 * "{{name}}" in a translation as one of its own values and leave it empty.
 */
export const placeholderWords = { name: '{{name}}', number: '{{number}}' } as const;
