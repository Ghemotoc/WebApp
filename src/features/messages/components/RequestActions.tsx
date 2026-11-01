/**
 * RequestActions: what the recipient of a message request sees under it: "Accept request" and
 * "Delete request" (story S1-E9-01, criterion 2; board Messages 5.5, Requests).
 *
 * Accepting lets both write. Deleting takes the request out of the lists and the sender is never
 * told; they still can't send more. Report sits beside the message itself (ChatMessages).
 * Who shows it: ChatPanel. What it calls: the onAnswer it is given.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MessagesFailure } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/** What the actions need. */
export interface RequestActionsProps {
  otherName: string;
  isAnswering: boolean;
  failure: MessagesFailure | null;
  onAnswer: (shouldAccept: boolean) => Promise<unknown>;
}

/**
 * Renders the request's card.
 *
 * @returns the card with its two buttons
 */
export function RequestActions({ otherName, isAnswering, failure, onAnswer }: RequestActionsProps) {
  const { t } = useMessagesTranslation();
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4">
      <h3 className="m-0 text-base font-semibold text-heading">
        {t('request.title', { name: otherName })}
      </h3>
      <p className="m-0 text-sm text-body">{t('request.explain')}</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isAnswering} onClick={() => void onAnswer(true).catch(() => undefined)}>
          {t('request.accept')}
        </Button>
        <Button
          variant="destructive"
          disabled={isAnswering}
          onClick={() => void onAnswer(false).catch(() => undefined)}
        >
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
