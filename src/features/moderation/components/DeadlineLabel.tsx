/**
 * DeadlineLabel: how long a case has left, or by how much it is overdue (story S1-E10-03a;
 * board 8.2, the Deadline column: "5 h 50 min left", "6 d 23 h left").
 *
 * A decided case shows when it was decided instead. The exact deadline sits in a <time> element's
 * dateTime and title, so a hover or a screen reader can get the full moment.
 * Who shows it: CaseRow, CasePage. What it calls: useNow for the moment, lib/deadline.ts for the
 * arithmetic.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { QueueCase } from '../api/moderationQueue';
import { useNow } from '../hooks/useNow';
import { deadlineScale, describeDeadline } from '../lib/deadline';

/**
 * The words for an open case's deadline.
 *
 * @param deadlineAt - the deadline
 * @param now - the current moment
 * @param t - the moderation translator
 * @returns the text, for example "5 h 50 min left"
 */
function openDeadlineText(deadlineAt: string, now: Date, t: TFunction<'moderation'>): string {
  const parts = describeDeadline(deadlineAt, now);
  const scale = deadlineScale(parts);
  // The numbers the text needs, as a plain object the translator accepts.
  const values = { days: parts.days, hours: parts.hours, minutes: parts.minutes };
  if (parts.side === 'overdue') {
    return scale === 'days'
      ? t('deadline.daysOverdue', values)
      : t('deadline.hoursOverdue', values);
  }
  return scale === 'days' ? t('deadline.daysLeft', values) : t('deadline.hoursLeft', values);
}

/**
 * Renders the label.
 *
 * @param props.theCase - the case
 * @returns a <time> with the words; overdue in the destructive colour and bold
 */
export function DeadlineLabel({ theCase }: { theCase: QueueCase }) {
  const { t, i18n } = useTranslation('moderation');
  const now = useNow();
  const fullMoment = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );

  // A decided case: when it was decided, not a countdown.
  if (theCase.status === 'decided' && theCase.decidedAt !== null) {
    return (
      <time dateTime={theCase.decidedAt} className="text-sm text-meta">
        {t('deadline.decidedOn', { when: fullMoment(theCase.decidedAt) })}
      </time>
    );
  }
  const isOverdue = new Date(theCase.deadlineAt).getTime() < now.getTime();
  return (
    <time
      dateTime={theCase.deadlineAt}
      title={fullMoment(theCase.deadlineAt)}
      className={isOverdue ? 'text-sm font-bold text-destructive' : 'text-sm text-body'}
    >
      {openDeadlineText(theCase.deadlineAt, now, t)}
    </time>
  );
}
