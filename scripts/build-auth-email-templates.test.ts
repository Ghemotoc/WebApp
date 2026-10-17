/**
 * Checks the committed Supabase Auth email templates are exactly what the generator makes from the
 * locale files and the brand config (story S1-E2-01), so a wording or brand change can't be
 * forgotten. Fix a failure with `npm run emails:build`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { authEmails, buildAuthEmail } from './build-auth-email-templates';

const localesFolder = fileURLToPath(new URL('../src/locales', import.meta.url));
const templatesFolder = fileURLToPath(new URL('../supabase/templates', import.meta.url));

describe('the Supabase Auth email templates', () => {
  it.each(authEmails)('$fileName matches the locale files (run npm run emails:build)', (email) => {
    const committed = readFileSync(`${templatesFolder}/${email.fileName}`, 'utf8');
    expect(committed).toBe(buildAuthEmail(email, localesFolder));
  });

  it.each(authEmails)('$fileName holds Romanian and English and its link', (email) => {
    const html = buildAuthEmail(email, localesFolder);
    expect(html).toContain('lang="ro"');
    expect(html).toContain('lang="en"');
    expect(html).toContain(email.linkTemplate);
  });

  it('every email that opens an account action links with a one-time token', () => {
    // The "password changed" notice only links to "Forgot your password?" (S1-E2-05).
    const actionEmails = authEmails.filter((email) => email.fileName !== 'password_changed.html');
    for (const email of actionEmails) expect(email.linkTemplate).toContain('{{ .TokenHash }}');
  });
});
