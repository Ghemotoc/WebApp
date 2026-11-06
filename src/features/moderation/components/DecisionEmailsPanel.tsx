/**
 * DecisionEmailsPanel: on the queue page, "Decision emails waiting: N" with "Send waiting
 * decision emails" (story S1-E10-04; DSA art. 16(5): someone who used the public form is told the
 * decision).
 *
 * Why it exists: the case page sends these emails right after a decision; if that failed (no
 * connection, the email service down), they wait here until someone sends them. Shows nothing
 * when none wait.
 * Who shows it: ModerationQueuePage. What it calls: useDecisionEmails.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useDecisionEmails } from '../hooks/useCaseStatements';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * Renders the panel.
 *
 * @returns the count and the button, or the last result, or nothing
 */
export function DecisionEmailsPanel() {
  const { t } = useTranslation('moderation');
  const emails = useDecisionEmails();
  if (emails.waitingCount === 0 && emails.result === null && emails.sendFailure === null)
    return null;
  return (
    <section
      aria-labelledby="decision-emails-heading"
      className="flex max-w-[720px] flex-col gap-3"
    >
      <h2 id="decision-emails-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('decisionEmails.heading', { count: emails.waitingCount })}
      </h2>
      <p className="m-0 text-body">{t('decisionEmails.intro')}</p>
      {emails.result !== null && (
        <Notice tone={emails.result.failed === 0 ? 'success' : 'error'}>
          {t('decisionEmails.result', { sent: emails.result.sent, failed: emails.result.failed })}
        </Notice>
      )}
      {emails.sendFailure !== null && (
        <Notice tone="error">{t(`failures.${emails.sendFailure}`)}</Notice>
      )}
      {emails.waitingCount > 0 && (
        <div>
          <Button
            disabled={emails.isSending}
            onClick={() => void emails.send().catch(errorShownByHook)}
          >
            {t(emails.isSending ? 'decisionEmails.sending' : 'decisionEmails.send')}
          </Button>
        </div>
      )}
    </section>
  );
}
