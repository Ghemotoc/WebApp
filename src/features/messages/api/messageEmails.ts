/**
 * Message emails and their quiet hours (bundle IDEAS-2, part c1; idea IDEA-20261101-6).
 *
 * Reads the "email" part of my_message_settings(); api/messages.ts saves it with
 * set_message_emails() (…_ideas2_c1_message_emails.sql). The database fills the defaults (quiet hours on for under-18s,
 * 21:00 to 07:00) and refuses an under-18's change that would end them early (Q50).
 * Who calls it: api/messages.ts.
 */
import type { Json } from '@/lib/database.types';

/** The person's message email choices; times are "HH:MM", Romanian time. */
export interface MessageEmailChoices {
  emailsOn: boolean;
  quietHoursOn: boolean;
  quietFrom: string;
  quietUntil: string;
  /** Under 18 (or age unknown): quiet hours stay on and cover 22:00 to 07:00 (Q50). */
  mustKeepQuietHours: boolean;
}

/** The safest reading when the answer is missing: emails on, quiet hours on and kept. */
const safestChoices: MessageEmailChoices = {
  emailsOn: true,
  quietHoursOn: true,
  quietFrom: '21:00',
  quietUntil: '07:00',
  mustKeepQuietHours: true,
};

/** Reads a time "HH:MM", or the fallback. */
function timeOf(value: Json | undefined, fallback: string): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

/**
 * Reads the "email" part of my_message_settings().
 *
 * @param value - the JSON the database returned
 * @returns the choices, or the safest reading when they are missing
 */
export function messageEmailChoicesOf(value: Json | undefined): MessageEmailChoices {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return safestChoices;
  }
  return {
    emailsOn: value.emails_on !== false,
    quietHoursOn: value.quiet_hours_on !== false,
    quietFrom: timeOf(value.quiet_from, safestChoices.quietFrom),
    quietUntil: timeOf(value.quiet_until, safestChoices.quietUntil),
    mustKeepQuietHours: value.must_keep_quiet_hours !== false,
  };
}
