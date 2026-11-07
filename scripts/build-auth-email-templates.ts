/**
 * Builds the Supabase Auth email templates from the locale files and the brand config
 * (story S1-E2-01; S1-E2-05 adds the reset and "password changed" emails).
 *
 * Who runs it: `npm run emails:build` after changing src/locales/<language>/email.json or
 * src/config/brand.ts. Its test (scripts/build-auth-email-templates.test.ts, part of `npm test`)
 * fails when the committed templates differ from what this script makes, like the types check.
 * What it writes: supabase/templates/<email>.html, which supabase/config.toml points Supabase Auth
 * at locally. Staging gets the same files by hand (the pull request's by-hand list).
 * How the language is chosen: every template holds Romanian and English. Supabase fills
 * {{ .Data.locale }} from the account's sign-up data; English shows when it is "en", Romanian
 * otherwise (the interface opens in Romanian for everyone, decided 17 Oct 2026, 11:48).
 * The waiting list (WAITLIST-1): the confirmation email has a second wording, "You're on the
 * list", used when {{ .Data.joins_waitlist }} is true (a sign-up without a code while the list is
 * on), the same choice server/send-email.ts makes for the staging and production sender.
 * Why generated: names are settings, not code (CLAUDE.md, decided 17 Oct 2026, 12:47). The brand
 * values come from src/config/brand.ts, so the brand check allows supabase/templates/ as output.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { brandDefaults } from '../src/config/brand';

/** One email: its file name, its text group in email.json and its button's link or its code. */
export interface AuthEmail {
  fileName: string;
  textGroup: string;
  /** The Go template that Supabase fills with the link; never a fixed address. */
  linkTemplate?: string;
  /** True when the email shows Supabase's 6-digit code ({{ .Token }}) instead of a button. */
  showsCode?: boolean;
  /** False for a notice of something already done ("password changed"): there is nothing to ignore. */
  includesIgnoreLine?: boolean;
  /** The words used instead when the sign-up joined the waiting list (WAITLIST-1). */
  waitlistTextGroup?: string;
}

/** The emails Supabase Auth sends with our wording. */
export const authEmails: AuthEmail[] = [
  {
    fileName: 'confirmation.html',
    textGroup: 'confirmation',
    waitlistTextGroup: 'waitlistConfirmation',
    linkTemplate: '{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email',
  },
  {
    fileName: 'magic_link.html',
    textGroup: 'magicLink',
    linkTemplate: '{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email',
  },
  // S1-E2-05: "Forgot your password?" sends this; the link opens /reset-password.
  {
    fileName: 'recovery.html',
    textGroup: 'recovery',
    linkTemplate: '{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery',
  },
  // S1-E2-05: changing the email in Settings sends this to the old and the new address
  // (double_confirm_changes) with its own 6-digit code, typed into Settings (Robert, 25 Oct 2026,
  // 09:15: codes, not links). Supabase fills {{ .Token }} with the code for that address.
  {
    fileName: 'email_change.html',
    textGroup: 'emailChange',
    showsCode: true,
  },
  // S1-E2-05: "the user gets an email" after a new password; its button starts a reset in case
  // it wasn't them.
  {
    fileName: 'password_changed.html',
    textGroup: 'passwordChanged',
    linkTemplate: '{{ .SiteURL }}/forgot-password',
    includesIgnoreLine: false,
  },
];

/** The words of one language, as in src/locales/<language>/email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/**
 * Fills {{productName}} and {{companyName}} and escapes the text for HTML.
 *
 * @param text - one string from email.json
 * @returns safe HTML text
 */
function fillAndEscape(text: string): string {
  const filled = text
    .split('{{productName}}')
    .join(brandDefaults.productName)
    .split('{{companyName}}')
    .join(brandDefaults.companyName);
  return filled.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The email's one action: the code in large digits, or the button with its link.
 *
 * @param email - which email
 * @param group - that email's words in one language
 * @returns an HTML paragraph
 */
function actionLine(email: AuthEmail, group: Record<string, string>): string {
  if (email.showsCode === true) {
    // The code is Supabase's own; spaced digits are easy to read and to type.
    return `<p style="margin:0 0 24px"><span style="font-size:14px;color:#5C4965">${fillAndEscape(group.codeLabel ?? '')}</span><br><strong style="display:inline-block;margin-top:8px;font-size:32px;letter-spacing:8px;color:#2A0E33">{{ .Token }}</strong></p>`;
  }
  return `<p style="margin:0 0 24px"><a href="${email.linkTemplate ?? ''}" style="display:inline-block;background:#2A0E33;color:#FBF7EC;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">${fillAndEscape(group.button ?? '')}</a></p>`;
}

/**
 * The body of one email in one language.
 *
 * @param texts - that language's email.json
 * @param email - which email
 * @returns an HTML fragment
 */
function emailBody(texts: EmailTexts, email: AuthEmail): string {
  const group = texts[email.textGroup] as Record<string, string>;
  const shared = (key: string) => fillAndEscape(texts[key] as string);
  return [
    `<h1 style="font-size:24px;color:#481C5F;margin:0 0 16px">${fillAndEscape(group.heading ?? '')}</h1>`,
    `<p style="margin:0 0 24px">${fillAndEscape(group.body ?? '')}</p>`,
    actionLine(email, group),
    `<p style="margin:0 0 8px;font-size:14px;color:#5C4965">${fillAndEscape(group.linkNote ?? '')}</p>`,
    email.includesIgnoreLine === false
      ? ''
      : `<p style="margin:0 0 24px;font-size:14px;color:#5C4965">${shared('notYou')}</p>`,
    `<p style="margin:0">${shared('signOff')}<br><span style="font-size:13px;color:#6B5A73">${shared('madeBy')}</span></p>`,
  ].join('\n    ');
}

/**
 * One wording of an email in both languages: English when the account chose it, else Romanian.
 *
 * @param email - which email, with the text group to use
 * @param localesFolder - src/locales
 * @returns the Go template choosing between the two languages
 */
function bothLanguages(email: AuthEmail, localesFolder: string): string {
  const read = (language: string) =>
    JSON.parse(readFileSync(`${localesFolder}/${language}/email.json`, 'utf8')) as EmailTexts;
  return `{{ if eq .Data.locale "en" }}
    <div lang="en">
    ${emailBody(read('en'), email)}
    </div>
    {{ else }}
    <div lang="ro">
    ${emailBody(read('ro'), email)}
    </div>
    {{ end }}`;
}

/**
 * Builds one template: Romanian unless the account chose English, and for the confirmation email
 * the waiting list's wording when the sign-up joined the list (WAITLIST-1).
 *
 * @param email - which email
 * @param localesFolder - src/locales
 * @returns the template's HTML
 */
export function buildAuthEmail(email: AuthEmail, localesFolder: string): string {
  // Step 1: the usual wording, and the waiting list's wording when this email has one.
  let content = bothLanguages(email, localesFolder);
  if (email.waitlistTextGroup !== undefined) {
    const waitlistEmail = { ...email, textGroup: email.waitlistTextGroup };
    content = `{{ if .Data.joins_waitlist }}
    ${bothLanguages(waitlistEmail, localesFolder)}
    {{ else }}
    ${content}
    {{ end }}`;
  }
  // Step 2: the page around it.
  return `<!-- Generated by scripts/build-auth-email-templates.ts from src/locales/*/email.json. Do not edit. -->
<html>
  <body style="margin:0;padding:24px;background:#FAF8F5;font-family:Inter,Arial,sans-serif;color:#26142E;line-height:1.6">
    ${content}
  </body>
</html>
`;
}

/** Writes every template into supabase/templates/. */
function main(): void {
  const localesFolder = fileURLToPath(new URL('../src/locales', import.meta.url));
  const templatesFolder = fileURLToPath(new URL('../supabase/templates', import.meta.url));
  for (const email of authEmails) {
    writeFileSync(`${templatesFolder}/${email.fileName}`, buildAuthEmail(email, localesFolder));
    console.log(`Wrote supabase/templates/${email.fileName}.`);
  }
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
