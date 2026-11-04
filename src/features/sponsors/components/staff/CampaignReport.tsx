/**
 * CampaignReport: a campaign's impressions and clicks per day, with "Download CSV" (story
 * S1-E12-03; bundle SPONSORS-c; board AdminSponsors "Reports").
 *
 * The table lists every day of the run so far, newest first, with the totals in its last row; the
 * CSV holds the same days oldest first. The numbers are totals only: nobody who saw or clicked is
 * recorded. Plain staff components, no doodles.
 * Who shows it: CampaignEditorPage, for any saved campaign (an ended one too).
 * What it calls: useCampaignReport(), campaignReportCsv() and downloadCsv().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { downloadCsv } from '@/features/staff/lib/downloadCsv';
import type { CampaignReportDay, StaffCampaign } from '@/schemas/sponsors';

import { useCampaignReport } from '../../hooks/useCampaignReport';
import { campaignReportCsv, campaignReportFileName } from '../../lib/campaignReportCsv';
import { sponsorDayInWords } from '../../lib/sponsorWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

/** The two totals over every day. */
function totalsOf(days: CampaignReportDay[]) {
  return days.reduce(
    (sum, day) => ({
      impressions: sum.impressions + day.impressions,
      clicks: sum.clicks + day.clicks,
    }),
    { impressions: 0, clicks: 0 },
  );
}

/** The table of days, newest first, and the totals row. */
function ReportTable({ days }: { days: CampaignReportDay[] }) {
  const { t, i18n } = useSponsorTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const totals = totalsOf(days);
  const cell = 'border-b border-hairline px-3 py-2 text-right tabular-nums';
  return (
    <div
      role="region"
      aria-labelledby="campaign-report-heading"
      tabIndex={0}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[360px] border-collapse text-sm">
        <caption className="sr-only">{t('report.caption')}</caption>
        <thead>
          <tr>
            <th scope="col" className="border-b border-hairline px-3 py-2 text-left">
              {t('report.day')}
            </th>
            <th scope="col" className={cell}>
              {t('report.impressions')}
            </th>
            <th scope="col" className={cell}>
              {t('report.clicks')}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((day) => (
            <tr key={day.day}>
              <th scope="row" className="border-b border-hairline px-3 py-2 text-left font-normal">
                {sponsorDayInWords(day.day, i18n.language)}
              </th>
              <td className={cell}>{numbers.format(day.impressions)}</td>
              <td className={cell}>{numbers.format(day.clicks)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <th scope="row" className="px-3 py-2 text-left">
              {t('report.total')}
            </th>
            <td className="px-3 py-2 text-right tabular-nums">
              {numbers.format(totals.impressions)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{numbers.format(totals.clicks)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders the section.
 *
 * @param props.campaign - the saved campaign
 * @returns the report section
 */
export function CampaignReport({ campaign }: { campaign: StaffCampaign }) {
  const { t } = useSponsorTranslation();
  const report = useCampaignReport(campaign.id);
  const days = report.data ?? [];
  // Step 1: the CSV of the same days, named after the campaign and its last day.
  const download = () => {
    const lastDay = days.at(-1)?.day ?? '';
    downloadCsv(campaignReportCsv(days), campaignReportFileName(campaign.name, lastDay));
  };
  return (
    <section aria-labelledby="campaign-report-heading" className="flex flex-col gap-3">
      <h2
        id="campaign-report-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('report.heading')}
      </h2>
      <p className="m-0 text-body">{t('report.intro')}</p>
      {report.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
      {report.data !== undefined && days.length === 0 && (
        <p className="m-0 text-body">{t('report.empty')}</p>
      )}
      {days.length > 0 && <ReportTable days={days} />}
      <div>
        <Button variant="secondary" disabled={days.length === 0} onClick={download}>
          {t('report.download')}
        </Button>
      </div>
    </section>
  );
}
