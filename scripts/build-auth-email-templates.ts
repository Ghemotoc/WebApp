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
 * The look: the same branded layout as the hook's emails (server/email-layout.ts, boards E01 and
 * E02, S1-E11-19), with the same words (authEmailContent() in server/send-email.ts), so an email
 * looks the same before and after the hook is switched on.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { brandDefaults } from '../src/config/brand';
import {
  emailLogoUrl,
  escapeHtml,
  renderEmailBody,
  renderEmailDocument,
  type EmailBrand,
} from '../server/email-layout';
import { authEmailContent, textOf } from '../server/send-email';

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

/** The brand parts of the layout, from today's brand config values. */
const templateBrand: EmailBrand = {
  productName: brandDefaults.productName,
  companyName: brandDefaults.companyName,
  companySiteUrl: brandDefaults.companySiteUrl,
  supportEmail: brandDefaults.supportEmail,
  logoUrl: emailLogoUrl(`https://${brandDefaults.siteDomain}`),
};

/**
 * The body of one email in one language: the branded layout with Supabase's link or code.
 *
 * @param texts - that language's email.json
 * @param email - which email
 * @returns an HTML fragment
 */
function emailBody(texts: EmailTexts, email: AuthEmail): string {
  // Step 1: a reader over the file text with the brand's names filled in (no admin overrides:
  // these files are what Supabase sends until the hook, which reads the overrides, is on).
  const read = (path: string) => textOf(texts, new Map(), path, templateBrand);
  // Step 2: the one action, Supabase's code or the link Supabase fills in.
  const action =
    email.showsCode === true ? { code: '{{ .Token }}' } : { link: email.linkTemplate ?? '' };
  const kind = { group: email.textGroup, includesIgnoreLine: email.includesIgnoreLine };
  return renderEmailBody(authEmailContent(kind, action, read), templateBrand);
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
  // Step 2: the page around it, in the account's language for screen readers.
  const document = renderEmailDocument({
    lang: '{{ if eq .Data.locale "en" }}en{{ else }}ro{{ end }}',
    title: escapeHtml(brandDefaults.productName),
    body: content,
  });
  return `<!-- Generated by scripts/build-auth-email-templates.ts from src/locales/*/email.json. Do not edit. -->
${document}`;
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
