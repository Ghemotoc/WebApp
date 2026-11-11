/**
 * InvestorNumbersSection: the investor numbers on the staff Metrics page (story S1-E15-04, bundle
 * ANALYTICS-1a; research doc "Research: reading analytics and suggestions").
 *
 * What it shows: the last night's active members and retention (InvestorLatestCard), this month
 * against last month (InvestorMonthCard) and two spreadsheet downloads, by month and by day.
 * Totals only, counted once a night; nothing here names a person. The owner and admins only:
 * the database refuses everyone else, and the page then shows nothing of this section.
 * Who shows it: MarchNumbersPage. What it calls: useInvestorNumbers, lib/investorCsv.ts and
 * lib/downloadCsv.ts.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { InvestorMonth, InvestorNumbers } from '../../api/investorNumbers';
import { useInvestorNumbers } from '../../hooks/useInvestorNumbers';
import { downloadCsv } from '../../lib/downloadCsv';
import { type CsvColumn, investorDaysCsv, investorMonthsCsv } from '../../lib/investorCsv';

import { InvestorLatestCard } from './InvestorLatestCard';
import { InvestorMonthCard } from './InvestorMonthCard';

/** The month spreadsheet's columns, in order. */
const monthKeys: Exclude<keyof InvestorMonth, 'month'>[] = [
  'signUps',
  'averageDailyActive',
  'monthlyActive',
  'storiesRead',
  'chapterReads',
  'chaptersFinished',
  'finishRate',
  'minutesInApp',
  'minutesReading',
  'writersPublishing',
  'retentionDay1',
  'retentionDay7',
  'retentionDay30',
];

/** The day spreadsheet's columns, as the database names them, in order. */
const dayKeys = [
  'active_members',
  'weekly_active_members',
  'monthly_active_members',
  'sign_ups',
  'signed_up_readers',
  'stories_read',
  'chapter_reads',
  'chapters_finished',
  'minutes_in_app',
  'minutes_reading',
  'writers_publishing',
  'writers_published',
  'return_rate',
  'retention_day_1',
  'retention_day_7',
  'retention_day_30',
];

/**
 * The two download buttons.
 *
 * @param props.numbers - what the files are made from
 * @param props.t - the staff translations
 * @returns the buttons
 */
function DownloadButtons({ numbers, t }: { numbers: InvestorNumbers; t: TFunction<'staff'> }) {
  const monthColumns: CsvColumn<Exclude<keyof InvestorMonth, 'month'>>[] = monthKeys.map((key) => ({
    key,
    label: t(`metrics.investor.csv.${key}`),
  }));
  const dayColumns: CsvColumn<string>[] = dayKeys.map((key) => ({
    key,
    label: t(`metrics.investor.csv.${key}`),
  }));
  return (
    <>
      <Button
        variant="secondary"
        onClick={() =>
          downloadCsv(
            investorMonthsCsv(numbers.months, monthColumns, t('metrics.investor.csv.month')),
            'investor-numbers-by-month.csv',
          )
        }
      >
        {t('metrics.investor.downloadMonths')}
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          downloadCsv(
            investorDaysCsv(numbers.days, dayColumns, t('metrics.investor.csv.day')),
            'investor-numbers-by-day.csv',
          )
        }
      >
        {t('metrics.investor.downloadDays')}
      </Button>
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the two cards, a wait, an error, or nothing for someone who may not see it
 */
export function InvestorNumbersSection() {
  const { t } = useTranslation('staff');
  const { numbers, failure } = useInvestorNumbers();
  // The page above already says who may see the numbers.
  if (failure === 'not_allowed') return null;
  if (failure !== null) return <Notice tone="error">{t('metrics.investor.unreachable')}</Notice>;
  if (numbers === null) return <p className="m-0 text-meta">{t('metrics.loading')}</p>;
  return (
    <>
      <InvestorLatestCard
        latest={numbers.latest}
        actions={<DownloadButtons numbers={numbers} t={t} />}
      />
      <InvestorMonthCard months={numbers.months} />
    </>
  );
}
