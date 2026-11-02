/**
 * MyDataRequestRow: one of the person's own data requests on Settings: what it was for, when it
 * reached us, when we'll answer (and why we need longer, when we do), and, when the team asks,
 * "Was it you?" with Yes and No (bundle ADMIN-2, part c1; story S1-E11-09 criterion 4).
 *
 * Who shows it: MyDataRequestsSection. What it calls: onAnswer(), which useMyDataRequests sends to
 * answer_data_request().
 */
import { Button } from '@/components/ui/Button';

import type { MyDataRequest } from '../api/myDataRequests';
import { formatCalendarDate } from '../lib/dataRequestDates';
import { useDataRequestsTranslation } from '../registerDataRequestsTranslations';

/** What the row needs. */
interface MyDataRequestRowProps {
  request: MyDataRequest;
  isAnswering: boolean;
  onAnswer: (isMine: boolean) => void;
}

/**
 * The question and its buttons, or the answer already given.
 *
 * @returns the part about the identity check, or nothing
 */
function IdentityQuestion({ request, isAnswering, onAnswer }: MyDataRequestRowProps) {
  const { t } = useDataRequestsTranslation();
  if (request.identity === 'confirmed')
    return <p className="m-0 text-body">{t('mine.confirmed')}</p>;
  if (request.identity === 'denied') return <p className="m-0 text-body">{t('mine.denied')}</p>;
  if (request.identity !== 'asked' || !request.isOpen) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-semibold text-ink">
        {t('mine.question', { channel: t(`mine.channels.${request.channel}`) })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isAnswering}
          aria-label={t('mine.yesLabel', { reference: request.reference })}
          onClick={() => onAnswer(true)}
        >
          {t('mine.yes')}
        </Button>
        <Button
          variant="secondary"
          disabled={isAnswering}
          aria-label={t('mine.noLabel', { reference: request.reference })}
          onClick={() => onAnswer(false)}
        >
          {t('mine.no')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function MyDataRequestRow({ request, isAnswering, onAnswer }: MyDataRequestRowProps) {
  const { t, i18n } = useDataRequestsTranslation();
  const dateOf = (calendarDate: string) => formatCalendarDate(calendarDate, i18n.language);
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <p className="m-0 font-semibold text-heading">
        {t('mine.title', {
          reference: request.reference,
          type: t(`mine.types.${request.requestType}`),
        })}
      </p>
      <p className="m-0 text-sm text-meta">
        {t('mine.received', { date: dateOf(request.receivedOn) })}
      </p>
      <p className="m-0 text-body">
        {request.isOpen
          ? t('mine.deadline', { date: dateOf(request.deadline) })
          : t('mine.answered')}
      </p>
      {request.isOpen && request.extensionReason !== null && (
        <p className="m-0 text-body">{t('mine.extended', { reason: request.extensionReason })}</p>
      )}
      <IdentityQuestion request={request} isAnswering={isAnswering} onAnswer={onAnswer} />
    </li>
  );
}
