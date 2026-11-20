/**
 * LaunchTaskCard: "Notify ANCOM within 45 days of launch" and "Transparency reports" on the staff
 * Metrics page (story S1-E11-04's legal note; board AdminMetrics).
 *
 * Law 50/2024: ANCOM must be notified within 45 days of launch. The card shows the due date from
 * the launch date (a setting the owner or an admin sets here) and whether a launch notice is
 * logged as done. Transparency reports are not required for micro and small enterprises (DSA art.
 * 15(2)); the second card says so. Who shows it: ComplianceLogSection.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { formatCalendarDate, formatLocalDate } from '@/lib/local-time';

import type { LaunchTask } from '../../api/complianceLog';

import { MetricsCard } from './MetricsCard';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the card needs. */
interface LaunchTaskCardProps {
  launch: LaunchTask;
  isSaving: boolean;
  hasSaveFailed: boolean;
  onSaveDate: (launchDate: string) => Promise<unknown>;
}

/**
 * The task's state in one line: done, due, or waiting for the launch date.
 *
 * @param launch - the task
 * @returns the line
 */
function useLaunchLine(launch: LaunchTask): string {
  const { t, i18n } = useTranslation('staff');
  // The launch and due dates are stored calendar days (SQL dates): shown as stored, no shift.
  const day = (date: string) => formatCalendarDate(date, i18n.language);
  if (launch.noticeDoneAt !== null && launch.noticeReference !== null) {
    return t('metrics.launch.done', {
      // When the notice was done is a moment (a timestamp): its day on the viewer's own calendar
      // (Robert, 20 Nov 2026, 18:36 UTC).
      date: formatLocalDate(new Date(launch.noticeDoneAt), i18n.language),
      reference: launch.noticeReference,
    });
  }
  if (launch.launchDate === null || launch.dueOn === null) return t('metrics.launch.noDate');
  return t('metrics.launch.due', { date: day(launch.dueOn), launch: day(launch.launchDate) });
}

/**
 * Renders both cards.
 *
 * @returns the cards side by side on wide screens
 */
export function LaunchTaskCard({
  launch,
  isSaving,
  hasSaveFailed,
  onSaveDate,
}: LaunchTaskCardProps) {
  const { t } = useTranslation('staff');
  const [launchDate, setLaunchDate] = useState(launch.launchDate ?? '');
  const line = useLaunchLine(launch);
  const isDone = launch.noticeDoneAt !== null;

  /** Saves the date; a failure shows under the field. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (launchDate !== '') await onSaveDate(launchDate).catch(errorShownByHook);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MetricsCard
        headingId="metrics-launch"
        eyebrow={t('metrics.launch.eyebrow')}
        heading={t('metrics.launch.heading')}
      >
        <p className="m-0 text-sm text-body">{t('metrics.launch.law')}</p>
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-ink">
          <InfoPill tone={isDone ? 'sage' : 'gold'}>
            {t(isDone ? 'metrics.launch.donePill' : 'metrics.launch.toDoPill')}
          </InfoPill>
          {line}
        </p>
        <form
          noValidate
          onSubmit={handleSubmit}

          className="flex flex-wrap items-end gap-3"
        >
          <TextInput
            id="launch-date"
            type="date"
            label={t('metrics.launch.dateLabel')}
            value={launchDate}
            onChange={(event) => setLaunchDate(event.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={isSaving || launchDate === ''}>
            {t(isSaving ? 'metrics.launch.saving' : 'metrics.launch.save')}
          </Button>
        </form>
        {hasSaveFailed && <Notice tone="error">{t('metrics.launch.failed')}</Notice>}
      </MetricsCard>
      <MetricsCard
        headingId="metrics-transparency"
        eyebrow={t('metrics.transparency.eyebrow')}
        heading={t('metrics.transparency.heading')}
      >
        <p className="m-0 text-sm text-body">{t('metrics.transparency.body')}</p>
      </MetricsCard>
    </div>
  );
}
