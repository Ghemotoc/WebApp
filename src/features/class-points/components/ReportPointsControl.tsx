/**
 * ReportPointsControl: "Report points as suspicious" for one chapter in the teacher's table
 * (bundle CLASS-POINTS, part 1; story S1-E8-16 criterion 2).
 *
 * The button opens one optional line saying what looks wrong and "Send report". Our moderation
 * team then looks at who gave the points and removes gifts if needed; the teacher is never told
 * who gave them. While a report is open the chapter reads "Reported to the moderation team".
 * Who shows it: ClassPointsTable, under each chapter. What it calls: useReportClassPoints →
 * report_class_points(), which writes the class's log.
 */
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { TableChapter } from '../api/classPointsTable';
import { useReportClassPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the control needs. */
export interface ReportPointsControlProps {
  chapter: TableChapter;
  /** The chapter as the table names it, for the button's accessible name. */
  chapterName: string;
}

/**
 * Renders the pill, the button or the open form.
 *
 * @returns the control
 */
export function ReportPointsControl({ chapter, chapterName }: ReportPointsControlProps) {
  const { t } = useClassPointsTranslation();
  const reporter = useReportClassPoints();
  const [isOpen, setIsOpen] = useState(false);
  const [why, setWhy] = useState('');
  const fieldId = useId();

  /** Sends the report; the table then shows the chapter as reported. */
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await reporter
      .report({ chapterId: chapter.chapterId, why })
      .then(() => true)
      .catch(() => false);
    if (sent) setIsOpen(false);
  }

  if (chapter.isReported) {
    return (
      <span className="self-start">
        <InfoPill tone="sky">{t('table.reported')}</InfoPill>
      </span>
    );
  }
  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        className="self-start"
        aria-label={t('table.reportFor', { chapter: chapterName })}
        onClick={() => setIsOpen(true)}
      >
        {t('table.report')}
      </Button>
    );
  }
  return (
    <form className="flex flex-col gap-3" onSubmit={send}>
      <TextInput
        id={fieldId}
        label={t('table.reportWhyLabel')}
        hint={t('table.reportWhyHint')}
        value={why}
        maxLength={500}
        onChange={(event) => setWhy(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={reporter.isRunning}>
          {t('table.reportSend')}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('table.reportCancel')}
        </Button>
      </div>
      <div aria-live="polite">
        {reporter.failure !== null && (
          <Notice tone="error">{t(`failures.${reporter.failure.failure}`)}</Notice>
        )}
      </div>
    </form>
  );
}
