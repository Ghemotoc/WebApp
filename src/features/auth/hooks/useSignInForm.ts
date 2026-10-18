/**
 * useSignInForm: the log-in form's answers, its result and the two ways to log in (story
 * S1-E2-05; board 2.2).
 *
 * Who calls it: SignInPage. What it calls: api/signIn.ts (signInWithPassword, sendLogInLink).
 * After a successful log-in the page goes home; the database decides what the person may do there.
 */
import { useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { sendLogInLink, signInWithPassword, type SignInResult } from '../api/signIn';

/** What the form shows after a try. */
export type SignInMessage =
  | SignInResult
  | { kind: 'email_missing' }
  | { kind: 'password_missing' }
  | { kind: 'link_sent'; email: string }
  | { kind: 'unreachable' };

/**
 * Holds the log-in form.
 *
 * @returns the answers, the message, whether a call is running and the two actions
 */
export function useSignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<SignInMessage | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /**
   * Runs one call with the shared client, turning a broken connection into a message.
   *
   * @param action - the call
   */
  async function run(
    action: (
      client: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
    ) => Promise<SignInMessage>,
  ) {
    setIsBusy(true);
    try {
      const client = await getSupabaseClient();
      setMessage(client === null ? { kind: 'unreachable' } : await action(client));
    } catch {
      setMessage({ kind: 'unreachable' });
    } finally {
      setIsBusy(false);
    }
  }

  /** "Log in": both fields are needed; the rest is Supabase's answer. */
  async function logIn() {
    if (email.trim() === '') return setMessage({ kind: 'email_missing' });
    if (password === '') return setMessage({ kind: 'password_missing' });
    await run((client) => signInWithPassword(client, email, password));
  }

  /** "Email me a log-in link": only the email is needed. */
  async function emailLink() {
    if (email.trim() === '') return setMessage({ kind: 'email_missing' });
    await run(async (client) => {
      const outcome = await sendLogInLink(client, email);
      return outcome === 'sent'
        ? { kind: 'link_sent', email: email.trim() }
        : { kind: 'too_many_attempts' };
    });
  }

  return { email, setEmail, password, setPassword, message, isBusy, logIn, emailLink };
}
