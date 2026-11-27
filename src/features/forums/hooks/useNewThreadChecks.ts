/**
 * useNewThreadChecks: what New thread says when "Post the thread" is pressed with a field empty
 * (bundle BOOKS-7, board F04, user story 7.4: "pressed with something missing, it says what in
 * words beside the field (Add a title. Write the first post.) and moves the focus to the first
 * one"; design books item 9).
 *
 * Who calls it: NewThreadForm. What it calls: useMissingField, once for each field.
 */
import { useMissingField } from '@/lib/forms/useMissingField';

import type { FailureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the checks need. */
export interface NewThreadCheckInput {
  ids: { forum: string; title: string; body: string };
  forumSlug: string;
  title: string;
  body: string;
  /** True when the forum is picked on the page, so a missing one is said too. */
  hasForumChoice: boolean;
}

/**
 * Builds the checks.
 *
 * @param input - the field ids and what is typed or picked now
 * @returns isReady() for the submit, and problemsFor() for the fields' lines
 */
export function useNewThreadChecks(input: NewThreadCheckInput) {
  const { t } = useForumsTranslation();
  const forum = useMissingField(input.hasForumChoice && input.forumSlug === '', input.ids.forum);
  const title = useMissingField(input.title.trim() === '', input.ids.title);
  const body = useMissingField(input.body.trim() === '', input.ids.body);

  /** Checks the last field first, so the focus ends on the first one missing. */
  function isReady(): boolean {
    const bodyReady = body.isReadyToSend();
    const titleReady = title.isReadyToSend();
    const forumReady = forum.isReadyToSend();
    return bodyReady && titleReady && forumReady;
  }

  /** Each field's line: what is missing first, else the database's refusal about it. */
  function problemsFor(messages: FailureMessages) {
    return {
      forum: forum.isShown ? t('newThread.missingForum') : null,
      title: title.isShown ? t('newThread.missingTitle') : (messages.title ?? null),
      body: body.isShown ? t('newThread.missingBody') : messages.body,
    };
  }

  return { isReady, problemsFor };
}
