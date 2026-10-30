/**
 * EditorFeedback: what happened after Save draft, Publish, Restore or Remove, and the list of
 * fields to fix when the server refused (story S1-E11-06 criterion 5: "Publish is refused with
 * the list of fields to fix").
 *
 * The message is a polite live region, so a screen reader hears it without focus moving.
 * Who uses it: PublishControls, and the interface text editor (S1-E11-18).
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { WebsiteContentError } from '../../api/websiteContentStore';

/** The part of an editor's state the feedback reads (the website and interface text editors). */
export interface FeedbackState {
  failure: WebsiteContentError | null;
  outcome: { action: string; goesLive: string | null } | null;
}

/** What the feedback needs. */
interface EditorFeedbackProps {
  state: FeedbackState;
  /** The field's label, for the list of fields to fix. */
  labelOf: (field: string) => string;
}

/**
 * Renders the message, or nothing.
 *
 * @returns the live region
 */
export function EditorFeedback({ state, labelOf }: EditorFeedbackProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const { failure, outcome } = state;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {failure !== null && failure.problems.length > 0 && (
        <Notice tone="error" title={t('fixFields')}>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            {failure.problems.map((problem) => (
              <li key={`${problem.field}-${problem.problem}-${problem.detail ?? ''}`}>
                {labelOf(problem.field)}:{' '}
                {t(`problems.${problem.problem}`, {
                  defaultValue: t('problems.invalid'),
                  address: problem.detail ?? '',
                })}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {failure !== null && failure.problems.length === 0 && (
        <Notice tone="error">
          {t(`failures.${failure.reason ?? failure.failure}`, {
            defaultValue: t(`failures.${failure.failure}`),
          })}
        </Notice>
      )}
      {outcome !== null && failure === null && (
        <p className="m-0 text-sm text-(--success-text)">
          {outcome.goesLive === null
            ? t(`outcomes.${outcome.action}`)
            : t('outcomes.publish', {
                date: formatRomaniaDate(new Date(`${outcome.goesLive}T12:00:00Z`), i18n.language),
              })}
        </p>
      )}
    </div>
  );
}
