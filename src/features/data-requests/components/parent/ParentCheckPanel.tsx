/**
 * ParentCheckPanel: the parent's or guardian's answer to "did you or your child ask for this?"
 * (bundle ADMIN-2, part c3; story S1-E11-09 criterion 5: the request "goes through the parent or
 * guardian recorded in the parental consent, checked the same way").
 *
 * Who shows it: DataRequestParentPage, for a check link. What it calls: onAnswer(), which
 * useParentLink sends to answer_data_request_parent(). Plain page: no doodles.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { ParentCheckLink } from '../../api/dataRequestParent';
import { formatCalendarDate } from '../../lib/dataRequestDates';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the panel needs. */
interface ParentCheckPanelProps {
  link: ParentCheckLink;
  isAnswering: boolean;
  answerFailed: boolean;
  onAnswer: (isOurs: boolean) => void;
}

/**
 * The words after an answer: thanks, and what happens next.
 *
 * @returns the panel's words
 */
function AnsweredWords({ link }: { link: ParentCheckLink }) {
  const { t } = useDataRequestsTranslation();
  const isConfirmed = link.identity === 'confirmed';
  return (
    <Notice tone={isConfirmed ? 'success' : 'info'}>
      <strong>{t(isConfirmed ? 'parent.confirmedHeading' : 'parent.deniedHeading')}</strong>{' '}
      {t(isConfirmed ? 'parent.confirmedBody' : 'parent.deniedBody', {
        reference: link.reference,
      })}
    </Notice>
  );
}

/**
 * Renders the question and its two answers, or the answer already given.
 *
 * @returns the panel
 */
export function ParentCheckPanel({
  link,
  isAnswering,
  answerFailed,
  onAnswer,
}: ParentCheckPanelProps) {
  const { t, i18n } = useDataRequestsTranslation();
  const intro = t('parent.checkIntro', {
    date: formatCalendarDate(link.receivedOn, i18n.language),
    reference: link.reference,
    what: t(`parent.what.${link.requestType}`),
    handle: link.handle,
  });
  return (
    <>
      <p className="m-0 text-body">{intro}</p>
      {link.identity === 'asked' ? (
        <div className="flex flex-wrap gap-3">
          <Button disabled={isAnswering} onClick={() => onAnswer(true)}>
            {t('parent.yes')}
          </Button>
          <Button variant="secondary" disabled={isAnswering} onClick={() => onAnswer(false)}>
            {t('parent.no')}
          </Button>
        </div>
      ) : (
        <AnsweredWords link={link} />
      )}
      {answerFailed && <Notice tone="error">{t('parent.answerFailed')}</Notice>}
    </>
  );
}
