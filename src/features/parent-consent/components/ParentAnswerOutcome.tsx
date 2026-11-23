/**
 * ParentAnswerOutcome: what a parent sees once a request has been answered (story S1-E2-03,
 * criteria 2, 3 and 5): "Thank you, you agreed" with "Withdraw my consent" (and a confirm step),
 * "You withdrew your consent", or "Thank you" after a no.
 *
 * Who shows it: ParentAnswerPage, for a request that is no longer waiting, and right after an
 * answer. What it calls: onWithdraw(), which useConsentRequest posts to our server. The link a
 * parent got after saying yes opens this page, so they can withdraw as easily as they agreed
 * (GDPR art. 7(3)).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatLocalDate } from '@/lib/local-time';

import type { ConsentFailure } from '../../../schemas/parentConsent';
import type { ConsentRequestDetails } from '../api/parentConsent';
import { useParentConsentTranslation } from '../registerParentConsentTranslations';

/** What the block needs. */
export interface ParentAnswerOutcomeProps {
  request: ConsentRequestDetails;
  isAnswering: boolean;
  failure: ConsentFailure | null;
  onWithdraw: () => void;
}

/**
 * "Withdraw my consent", with a confirm step before anything changes.
 *
 * @returns the button, or the question and its two answers
 */
function WithdrawControl(props: { isAnswering: boolean; onWithdraw: () => void }) {
  const { t } = useParentConsentTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <Button variant="destructive" className="self-start" onClick={() => setIsConfirming(true)}>
        {t('parent.withdraw')}
      </Button>
    );
  }
  return (
    <div
      role="group"
      aria-labelledby="parent-consent-withdraw-question"
      className="flex flex-col gap-3"
    >
      <p id="parent-consent-withdraw-question" className="m-0 font-semibold text-ink-heading">
        {t('parent.withdrawConfirm')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={props.isAnswering} onClick={props.onWithdraw}>
          {t('parent.withdrawYes')}
        </Button>
        <Button variant="secondary" onClick={() => setIsConfirming(false)}>
          {t('parent.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the outcome for an answered request.
 *
 * @returns the block for agreed, withdrawn or refused
 */
export function ParentAnswerOutcome({
  request,
  isAnswering,
  failure,
  onWithdraw,
}: ParentAnswerOutcomeProps) {
  const { t, i18n } = useParentConsentTranslation();
  const handle = request.handle;
  if (request.status === 'agreed') {
    const date =
      request.decidedAt === null ? '' : formatLocalDate(new Date(request.decidedAt), i18n.language);
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success" title={t('parent.agreedHeading', { date })}>
          {t('parent.agreedBody', { handle })}
        </Notice>
        {failure !== null && <Notice tone="error">{t(`failures.${failure}`)}</Notice>}
        <WithdrawControl isAnswering={isAnswering} onWithdraw={onWithdraw} />
      </div>
    );
  }
  if (request.status === 'withdrawn') {
    return (
      <Notice tone="info" title={t('parent.withdrawnHeading')}>
        {t('parent.withdrawnBody', { handle })}
      </Notice>
    );
  }
  return (
    <Notice tone="info" title={t('parent.refusedHeading')}>
      {t('parent.refusedBody')}
    </Notice>
  );
}
