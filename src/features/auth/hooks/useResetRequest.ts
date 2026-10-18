/**
 * useResetRequest: asking for a password reset link (story S1-E2-05).
 *
 * Who calls it: ForgotPasswordPage. What it calls: api/signIn.ts → sendResetLink(). Any answer
 * but a broken connection or Supabase's limit reads as "sent", so it never reveals who has an
 * account.
 */
import { useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { sendResetLink } from '../api/signIn';

/** The state of the last send. */
export type SendState =
  'idle' | 'sending' | 'sent' | 'too_many_attempts' | 'unreachable' | 'email_missing';

/**
 * Holds the request.
 *
 * @returns the email, the state, whether a link has been sent at least once, and send()
 */
export function useResetRequest() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SendState>('idle');
  // Once sent, the page stays on "Check your email", also while sending again.
  const [hasSent, setHasSent] = useState(false);

  /** Sends the link. */
  async function send() {
    if (email.trim() === '') return setState('email_missing');
    setState('sending');
    try {
      const client = await getSupabaseClient();
      const outcome = client === null ? 'unreachable' : await sendResetLink(client, email);
      setState(outcome);
      if (outcome === 'sent') setHasSent(true);
    } catch {
      setState('unreachable');
    }
  }

  return { email, setEmail, state, hasSent, send };
}
