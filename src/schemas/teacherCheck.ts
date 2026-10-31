/**
 * The Teacher badge's contract: what the screens send to /api/teacher-check/… and what comes back,
 * and the rules for a school address (story S1-E2-11). Shared by the screens
 * (src/features/teacher-badge/) and the server (server/teacher-check.ts), so both check the same
 * rules. Imported with a relative path because Cloudflare's functions build doesn't know the "@/"
 * alias.
 */
import { z } from 'zod';

/** The two languages the school email can be in. */
export const teacherCheckLanguages = ['ro', 'en'] as const;
export type TeacherCheckLanguage = (typeof teacherCheckLanguages)[number];

/**
 * The personal email services the board lists (Onboarding 2.5, step 3: "Personal addresses like
 * Gmail don't count"). The database's is_personal_email_domain() has the same list and is the
 * one that decides; this copy only drives the hint under the field.
 */
export const personalEmailDomains = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.ro',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
] as const;

/** The person asks for a link: their school address and the email's language. */
export const teacherLinkRequestSchema = z.object({
  schoolEmail: z.string().trim().toLowerCase().email().max(254),
  language: z.enum(teacherCheckLanguages),
});

/** A checked request. */
export type TeacherLinkRequest = z.infer<typeof teacherLinkRequestSchema>;

/** Why a link couldn't be sent, as the screen shows it. */
export const teacherLinkFailures = [
  'signed_out',
  'invalid',
  'personal_address',
  'not_available',
  'too_soon',
  'unavailable',
] as const;
export type TeacherLinkFailure = (typeof teacherLinkFailures)[number];

/** A failed request: one of the reasons above. */
export const teacherLinkFailureSchema = z.object({ error: z.enum(teacherLinkFailures) });

/** What the hint under the school email field says (board: the live status line). */
export type SchoolEmailHint = 'empty' | 'not_email' | 'personal' | 'school' | 'other';

/**
 * The domain of an address, in lower case.
 *
 * @param email - the address
 * @returns what follows the "@", or an empty text without one
 */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase();
}

/**
 * What the hint under the field says about the address typed so far (board 2.5, step 3).
 *
 * @param email - the address as typed
 * @returns empty, not_email ("This doesn't look like an email address yet."), personal (refused),
 *   school (a .edu.ro address: "Looks like a school address.") or other ("We'll check this
 *   address belongs to a school.")
 */
export function schoolEmailHint(email: string): SchoolEmailHint {
  const typed = email.trim();
  if (typed === '') return 'empty';
  if (!z.string().email().safeParse(typed).success) return 'not_email';
  const domain = emailDomain(typed);
  if (personalEmailDomains.some((personal) => personal === domain)) return 'personal';
  return domain.endsWith('.edu.ro') ? 'school' : 'other';
}
