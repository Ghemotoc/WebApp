/**
 * The parts of a report card for "Copied from a published work" (story S1-E10-08): the reported
 * passage and the reporter's source side by side, and "Ask for more details" with the question
 * and the reporter's answer. Needs the lawyer's review before launch.
 *
 * No similarity score: a moderator compares the two texts themselves (no percentage is a legal
 * safe harbour; Infopaq). Plain staff components, no doodles.
 * Who shows them: CaseReports, inside each report. What they call: useAskForDetails.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { CaseReport, CopySource } from '../api/moderationQueue';
import { useAskForDetails } from '../hooks/usePublicNotices';

import { ReasonForm } from './ReasonForm';

/**
 * One column of the comparison: a heading and a passage, or "not given".
 *
 * @returns the column
 */
function PassageColumn({ heading, text }: { heading: string; text: string | null }) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h4 className="m-0 text-sm font-semibold text-heading">{heading}</h4>
      <blockquote className="m-0 rounded-[12px] border border-border bg-panel p-3 text-[15px] whitespace-pre-line text-body">
        {text ?? t('copied.notGiven')}
      </blockquote>
    </div>
  );
}

/**
 * The source's title, author and reference as one line, leaving out what wasn't given.
 *
 * @param source - the reporter's source
 * @returns for example "Ion · Liviu Rebreanu · ISBN 978…"
 */
function sourceLine(source: CopySource | null): string | null {
  if (source === null) return null;
  const parts = [source.title, source.author, source.reference].filter(
    (part): part is string => part !== null,
  );
  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * The comparison: the source line, then the two passages side by side (one under the other on
 * a phone).
 *
 * @returns the section
 */
export function CopiedWorkComparison({ report }: { report: CaseReport }) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-body">
        <span className="font-semibold">{t('copied.source')}: </span>
        {sourceLine(report.copySource) ?? t('copied.notGiven')}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <PassageColumn heading={t('copied.inTheStory')} text={report.reportedPassage} />
        <PassageColumn
          heading={t('copied.inTheSource')}
          text={report.copySource?.passage ?? null}
        />
      </div>
    </div>
  );
}

/**
 * The question already asked and the answer, or "waiting" while it hasn't come.
 *
 * @returns the two lines, or nothing before any question
 */
function QuestionAndAnswer({ report }: { report: CaseReport }) {
  const { t } = useTranslation('moderation');
  if (report.detailQuestion === null) return null;
  return (
    <>
      <p className="m-0 text-sm text-body">
        <span className="font-semibold">{t('copied.asked')}: </span>
        {report.detailQuestion}
      </p>
      <p className="m-0 text-sm text-body">
        <span className="font-semibold">{t('copied.answer')}: </span>
        {report.detailAnswer ?? t('copied.waiting')}
      </p>
    </>
  );
}

/**
 * "Ask for more details": the question so far, then the button and its question box while the
 * case is open and no question is waiting.
 *
 * @returns the part
 */
export function AskForDetails({ report, isCaseOpen }: { report: CaseReport; isCaseOpen: boolean }) {
  const { t } = useTranslation('moderation');
  const details = useAskForDetails();
  const [isAsking, setIsAsking] = useState(false);
  const isWaiting = report.detailQuestion !== null && report.detailAnswer === null;
  const mayAsk = isCaseOpen && !isWaiting;
  return (
    <div className="flex flex-col gap-2">
      <QuestionAndAnswer report={report} />
      {details.askFailure !== null && (
        <Notice tone="error">{t(`failures.${details.askFailure}`)}</Notice>
      )}
      {mayAsk && isAsking && (
        <ReasonForm
          id={`ask-${report.reference}`}
          label={t('copied.question')}
          confirmLabel={t('copied.send')}
          isBusy={details.isAsking}
          onConfirm={async (question) => {
            await details.ask(report.reference, question);
            setIsAsking(false);
          }}
          onCancel={() => setIsAsking(false)}
        />
      )}
      {mayAsk && !isAsking && (
        <div>
          <Button
            variant="secondary"
            aria-label={t('copied.askLabel', { reference: report.reference })}
            onClick={() => setIsAsking(true)}
          >
            {t('copied.ask')}
          </Button>
        </div>
      )}
    </div>
  );
}
