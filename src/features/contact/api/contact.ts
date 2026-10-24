/**
 * Sends a Contact us message to our own Pages Function, /api/contact (story S1-E14-04; decided
 * 23 Oct 2026, Q10a: the form posts through our own function, so no third-party script or cookie
 * reaches the page, CLAUDE.md rule 7).
 *
 * Who calls it: hooks/useContactForm.ts.
 * What it calls next: POST /api/contact (functions/api/contact.ts on Cloudflare, the Vite plugin
 * locally), which checks the message with the same zod schema (src/schemas/contact.ts) and sends
 * the two emails. For a signed-in person the account's email, username and user ID go with the
 * message (reply-to and so staff find the account, Q10e); never the year of birth or the age check.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  contactResponseSchema,
  type ContactRequest,
  type ContactResponse,
} from '@/schemas/contact';

/** Why a message wasn't sent, in words the form can explain. */
export type ContactFailure = 'invalid' | 'unsent' | 'unreachable';

/** The error a refused message throws. */
export class ContactError extends Error {
  constructor(public readonly failure: ContactFailure) {
    super(`Contact message failed: ${failure}`);
  }
}

/** What the signed-in person adds to the message, read from the session. */
export interface SenderIdentity {
  email: string;
  handle: string | null;
  userId: string;
}

/**
 * Who is signed in, for the message: the account's email, username and user ID.
 *
 * @param client - the shared Supabase client, or null when the app has no database settings
 * @returns the identity, or null for a visitor
 */
export async function senderIdentity(
  client: AppSupabaseClient | null,
): Promise<SenderIdentity | null> {
  if (client === null) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (user === undefined || user.email === undefined) return null;
  const { data: profile } = await client
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .maybeSingle();
  return { email: user.email, handle: profile?.handle ?? null, userId: user.id };
}

/**
 * Sends the message.
 *
 * @param message - the checked message
 * @returns the reference to quote
 * Errors: throws ContactError: invalid (400), unsent (the email service failed, 502) or unreachable.
 */
export async function sendContactMessage(message: ContactRequest): Promise<ContactResponse> {
  let response: Response;
  try {
    response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch {
    throw new ContactError('unreachable');
  }
  if (response.status === 400) throw new ContactError('invalid');
  if (!response.ok) throw new ContactError('unsent');
  const parsed = contactResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ContactError('unreachable');
  return parsed.data;
}
