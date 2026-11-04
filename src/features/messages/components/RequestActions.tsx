/**
 * RequestActions: what the recipient of a message request sees under it: "Accept request",
 * "No thanks" and "Delete request" (story S1-E9-01, criterion 2; board Messages 5.5, Requests;
 * "No thanks" from bundle IDEAS-2, idea IDEA-20261101-7).
 *
 * Accepting lets both write. "No thanks" closes the request and shows the sender one fixed, polite
 * line; they can't ask again for 30 days. Deleting takes the request out of the lists and the
 * sender is never told; they still can't send more. Report sits beside the message itself
 * (ChatMessages).
 * Who shows it: ChatPanel. What it calls: the onAnswer it is given.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MessagesFailure, RequestAnswer } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/** What the actions need. */
export interface RequestActionsProps {
  otherName: string;
  isAnswering: boolean;
  failure: MessagesFailure | null;
  onAnswer: (answer: RequestAnswer) => Promise<unknown>;
}

/**
 * Renders the request's card.
 *
 * @returns the card with its three buttons
 */
export function RequestActions({ otherName, isAnswering, failure, onAnswer }: RequestActionsProps) {
  const { t } = useMessagesTranslation();
  /** Sends one answer; a refusal shows below, from the hook's state. */
  const answer = (chosen: RequestAnswer) => void onAnswer(chosen).catch(() => undefined);
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4">
      <h3 className="m-0 text-base font-semibold text-heading">
        {t('request.title', { name: otherName })}
      </h3>
      <p className="m-0 text-sm text-body">{t('request.explain')}</p>
      <p className="m-0 text-sm text-body">{t('request.noThanksExplain')}</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isAnswering} onClick={() => answer('accept')}>
          {t('request.accept')}
        </Button>
        <Button variant="secondary" disabled={isAnswering} onClick={() => answer('no_thanks')}>
          {t('request.noThanks')}
        </Button>
        <Button variant="destructive" disabled={isAnswering} onClick={() => answer('delete')}>
          {t('request.delete')}
        </Button>
      </div>
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: 60 })}</Notice>
        )}
      </div>
    </div>
  );
}
