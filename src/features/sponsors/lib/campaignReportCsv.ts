/**
 * The CSV of a campaign's report: one line per day with its impressions and clicks (story
 * S1-E12-03 criterion 2; bundle SPONSORS-c).
 *
 * The header stays in English whatever the interface language, so a sponsor's spreadsheet reads
 * the same file every time; the days are ISO dates (YYYY-MM-DD). The campaign's name goes into
 * the file name only, cleaned to letters, digits and hyphens.
 * Who calls it: components/staff/CampaignReport.tsx, before downloadCsv().
 */
import type { CampaignReportDay } from '@/schemas/sponsors';

/**
 * Builds the file's text.
 *
 * @param days - the report, oldest first
 * @returns the CSV, with a header line and a line ending after every line
 */
export function campaignReportCsv(days: CampaignReportDay[]): string {
  const lines = ['day,impressions,clicks'];
  // Every value is a date or a whole number, so nothing needs quoting.
  for (const day of days) lines.push(`${day.day},${day.impressions},${day.clicks}`);
  return `${lines.join('\n')}\n`;
}

/**
 * The file's name: "sponsor-report-<campaign name>-<last day>.csv".
 *
 * @param campaignName - the campaign's name, as staff typed it
 * @param lastDay - the report's last day, or an empty string when it has no days
 * @returns a name with only lowercase letters, digits, hyphens and the ending
 */
export function campaignReportFileName(campaignName: string, lastDay: string): string {
  // Accents come off ("Poezie, sponsorizată" → "poezie-sponsorizata"); anything else becomes a hyphen.
  const plainName = campaignName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const parts = ['sponsor-report', plainName === '' ? 'campaign' : plainName];
  if (lastDay !== '') parts.push(lastDay);
  return `${parts.join('-')}.csv`;
}
