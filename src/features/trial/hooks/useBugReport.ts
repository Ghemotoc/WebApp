/**
 * useBugReport: sends a trial bug report through the Contact us pipeline (TRIAL-FEEDBACK).
 *
 * Who calls it: components/BugReportPanel.tsx.
 * What it calls: the contact feature's senderIdentity() and sendContactMessage() (POST
 * /api/contact, server/contact.ts), and lib/pageContext.ts for the page details.
 * Where it goes: a support ticket under Bug ("Bug report", migration TRIAL-1) and an email to the
 * support inbox, with the tester's username and user ID so staff can find the account, never
 * their year of birth or age check (S1-E14-04's rule).
 */
import { useMutation } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';
import type { BugReportKind } from '@/schemas/contact';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';

import { ContactError, sendContactMessage, senderIdentity } from '@/features/contact/api/contact';

import { currentPageContext } from '../lib/pageContext';

/** What the tester wrote. */
export interface BugReportDraft {
  kind: BugReportKind;
  message: string;
}

/**
 * Reads who is reporting, builds the message and sends it.
 *
 * @param draft - the kind and the words
 * @param language - the page's language
 * @returns the ticket's reference
 * Errors: ContactError('unsent') when no one is signed in (the tab shows only to members), or
 *   whatever sendContactMessage() raises.
 */
async function sendBugReport(draft: BugReportDraft, language: string): Promise<string> {
  // Step 1: the tester's email, username and user ID, from the session.
  const sender = await senderIdentity(await getSupabaseClient());
  if (sender === null) throw new ContactError('unsent');
  // Step 2: the message, with the page details the panel promises to add.
  const answer = await sendContactMessage({
    topic: 'bug_report',
    bugKind: draft.kind,
    message: draft.message,
    email: sender.email,
    handle: sender.handle ?? undefined,
    userId: sender.userId,
    language: writtenLanguageFor(language),
    pageContext: currentPageContext(),
  });
  return answer.reference;
}

/**
 * Gives the panel a send function and the state of the last send.
 *
 * @param language - the page's language ("ro", "en", or a Nordic one, read in English)
 * @returns send(draft), whether it is sending, whether it has failed or been sent, and reset()
 */
export function useBugReport(language: string) {
  const send = useMutation({
    mutationFn: (draft: BugReportDraft) => sendBugReport(draft, language),
  });
  return {
    send: (draft: BugReportDraft) => send.mutate(draft),
    isSending: send.isPending,
    hasFailed: send.isError,
    isSent: send.isSuccess,
    reset: () => send.reset(),
  };
}
