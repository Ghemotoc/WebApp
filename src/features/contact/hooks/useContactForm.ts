/**
 * useContactForm: the Contact us form's state: who is sending, the send and its result (story
 * S1-E14-04).
 *
 * Who calls it: ContactPage. What it calls: api/contact.ts. A signed-in person's email, username
 * and user ID are read from the session once and attached to the message; a visitor types an
 * email.
 */
import { useMutation, useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';
import type { ContactRequest } from '@/schemas/contact';

import {
  ContactError,
  sendContactMessage,
  senderIdentity,
  type ContactFailure,
  type SenderIdentity,
} from '../api/contact';

/**
 * The reason a send failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ContactError
 */
function failureOf(hasFailed: boolean, error: unknown): ContactFailure | null {
  if (!hasFailed) return null;
  return error instanceof ContactError ? error.failure : 'unreachable';
}

/**
 * Follows the form.
 *
 * @returns the sender (null for a visitor; undefined while unknown), send(), and its state
 */
export function useContactForm() {
  const sender = useQuery<SenderIdentity | null>({
    queryKey: ['contact-sender'],
    retry: false,
    queryFn: async () => senderIdentity(await getSupabaseClient()),
  });
  const send = useMutation({
    mutationFn: (message: ContactRequest) => sendContactMessage(message),
  });
  return {
    sender: sender.data,
    isSenderKnown: !sender.isPending,
    send: (message: ContactRequest) => send.mutateAsync(message),
    isSending: send.isPending,
    failure: failureOf(send.isError, send.error),
    reference: send.data?.reference ?? null,
    reset: () => send.reset(),
  };
}
