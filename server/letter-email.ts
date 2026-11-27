/**
 * Gives the emails written as lines of text the branded HTML look of boards E01 to E05 (the
 * Emails page of the member design file; S1-E11-19), next to the plain text they already send.
 *
 * Why: the Auth and notification emails were drawn in the branded layout first; the rest (parent
 * consent and spotlight, the data request emails to parents, the teacher check, support tickets,
 * the opening list, the waitlist alert, decision emails, and the Contact us and public notice
 * acknowledgements) still went out as plain text only. They all write their email the same way,
 * as lines followed by the sign-off and "An app by …", so one helper turns those same lines into
 * the layout, and the plain text stays exactly as it was for apps that show no HTML.
 * How a letter is drawn: the subject is the heading; the first line that ends with "words:
 * address" becomes the one button, with the full address under it; lines before it sit above,
 * lines after it below; any other address in a line becomes a link; the sign-off ends the card,
 * and "An app by …" sits under it with the company's name linking to its site (Robert, 23 Nov 2026).
 * Emails whose words are written in code rather than email.json (the legal acknowledgements
 * and decisions) go through withLetterLayout(), which reads the same shape from the finished text:
 * paragraphs split on blank lines, the last one the sign-off.
 * Who calls it: the email builders in server/ (parent-consent, data-request-parent,
 * teacher-check, support-emails, opening-list, waitlist-alerts, decision-emails, contact, notice).
 * What it calls: renderEmailHtml() in server/email-layout.ts.
 */
import { brandDefaults } from '../src/config/brand';
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';

import type { OutgoingEmail } from './contact';
import {
  emailLogoUrl,
  renderEmailHtml,
  type EmailAction,
  type EmailBrand,
  type EmailContent,
} from './email-layout';

/** One email written as lines of text, already in the person's language. */
export interface Letter {
  to: string;
  subject: string;
  /** "ro" or "en", for the lang attribute screen readers use. */
  language: string;
  /** The words, one paragraph each, with any address written out in them. */
  lines: string[];
  /** "The Ghemotoc team" (email.json signOff). */
  signOff: string;
  /** "An app by …" (email.json madeBy); left out of staff alerts, which have no footer line. */
  madeBy?: string;
  /** "Or paste this link into your browser:" (email.json pasteLink), shown above the full link. */
  pasteLabel: string;
  brand: EmailBrand;
  /** The address a reply goes to, when it isn't the sender. */
  replyTo?: string;
}

/** What the brand part of a letter is made from; every value comes from the brand settings. */
export interface LetterBrandParts {
  productName: string;
  companyName: string;
  supportEmail: string;
  /** The site's address (the request's origin), where the PNG logo is served. */
  siteUrl: string;
  /** The company's site; today's value from src/config/brand.ts when left out. */
  companySiteUrl?: string;
}

/** The layout's brand when the email's server knows only the product's name and inbox. */
export interface PlainBrandParts {
  productName: string;
  supportEmail: string;
  siteUrl: string;
  /** VITE_BRAND_COMPANY_NAME; today's value from src/config/brand.ts when left out. */
  companyName?: string;
  companySiteUrl?: string;
}

/**
 * The brand part of the layout for a letter.
 *
 * @param parts - the names and addresses the email's server already has
 * @returns the layout's brand
 */
export function letterBrand(parts: LetterBrandParts): EmailBrand {
  return {
    productName: parts.productName,
    companyName: parts.companyName,
    companySiteUrl: parts.companySiteUrl ?? brandDefaults.companySiteUrl,
    supportEmail: parts.supportEmail,
    logoUrl: emailLogoUrl(parts.siteUrl),
  };
}

/** A line that is a call to act: "Agree here: https://…" (the words, then the address alone). */
const buttonLinePattern = /^(.*\S)\s*:\s*(https?:\/\/\S+)$/s;

/**
 * Reads a line as a button, when it is the words followed by one address.
 *
 * @param line - one line of the letter
 * @param pasteLabel - the words above the full link
 * @returns the button, or null for a line that stays a paragraph
 */
function buttonFrom(line: string, pasteLabel: string): EmailAction | null {
  const match = buttonLinePattern.exec(line.trim());
  if (match === null) return null;
  const label = match[1] ?? '';
  const url = match[2] ?? '';
  // A long sentence before the address reads better as words with a link than as a button.
  if (label.includes('\n') || label.length > 60) return null;
  return { label, url, pasteLabel };
}

/**
 * What a letter says, for the layout.
 *
 * @param letter - the email's lines and names
 * @returns the content for renderEmailHtml()
 */
export function letterContent(letter: Letter): EmailContent {
  // Step 1: the first line that reads as a button becomes the one button; the rest keep order.
  const before: string[] = [];
  const after: string[] = [];
  let action: EmailAction | undefined;
  for (const line of letter.lines) {
    if (action !== undefined) {
      after.push(line);
      continue;
    }
    const button = buttonFrom(line, letter.pasteLabel);
    if (button === null) before.push(line);
    else action = button;
  }
  // Step 2: the heading is the subject; the first words are what an inbox shows beside it.
  return {
    heading: letter.subject,
    preheader: before[0] ?? action?.label ?? letter.subject,
    paragraphs: before,
    action,
    afterAction: after,
    signOff: letter.signOff,
    madeBy: letter.madeBy ?? '',
  };
}

/**
 * The plain text the letter has always sent: the lines, the sign-off and "An app by …".
 *
 * @param letter - the email's lines and names
 * @returns the text part
 */
export function letterText(letter: Letter): string {
  const closing = letter.madeBy === undefined ? [letter.signOff] : [letter.signOff, letter.madeBy];
  return [...letter.lines, ...closing].join('\n\n');
}

/**
 * Adds the branded HTML part to an email whose text was written in code (the legal
 * acknowledgements and decisions, whose words are fixed by law and not admin-editable). The text
 * is left exactly as it was.
 *
 * @param email - the finished email; its text's paragraphs are split on blank lines and the last
 *   one is read as the sign-off ("The … team")
 * @param language - "ro" or "en"
 * @param brandParts - the names and addresses the email's server has
 * @returns the same email with its html part
 */
export function withLetterLayout(
  email: OutgoingEmail,
  language: 'ro' | 'en',
  brandParts: PlainBrandParts,
): OutgoingEmail {
  // Step 1: the paragraphs, and the sign-off at the end.
  const paragraphs = email.text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim());
  const signOff = paragraphs.length > 1 ? (paragraphs.pop() ?? '') : '';
  // Step 2: the layout's own words come from email.json's file text in the email's language.
  const words = language === 'ro' ? romanianEmail : englishEmail;
  const companyName = brandParts.companyName ?? brandDefaults.companyName;
  const brand = letterBrand({ ...brandParts, companyName });
  // Step 3: the same layout as every other letter.
  const letter: Letter = {
    to: email.to,
    subject: email.subject,
    language,
    lines: paragraphs,
    signOff,
    madeBy: words.madeBy.split('{{companyName}}').join(companyName),
    pasteLabel: words.pasteLink,
    brand,
  };
  return { ...email, html: renderEmailHtml(language, letterContent(letter), brand) };
}

/**
 * The email, ready to send: the same plain text as before, now with the branded HTML part.
 *
 * @param letter - the email's lines and names
 * @returns the email
 */
export function letterEmail(letter: Letter): OutgoingEmail {
  const email: OutgoingEmail = {
    to: letter.to,
    subject: letter.subject,
    text: letterText(letter),
    html: renderEmailHtml(letter.language, letterContent(letter), letter.brand),
  };
  if (letter.replyTo !== undefined) email.replyTo = letter.replyTo;
  return email;
}
