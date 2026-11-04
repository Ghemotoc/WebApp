/**
 * Unit tests for the campaign report's CSV (story S1-E12-03 criterion 2; bundle SPONSORS-c).
 */
import { describe, expect, it } from 'vitest';

import { campaignReportCsv, campaignReportFileName } from './campaignReportCsv';

describe('campaignReportCsv', () => {
  it('writes a header and one line of daily totals per day, oldest first', () => {
    const csv = campaignReportCsv([
      { day: '2026-11-03', impressions: 0, clicks: 0 },
      { day: '2026-11-04', impressions: 120, clicks: 7 },
    ]);
    expect(csv).toBe('day,impressions,clicks\n2026-11-03,0,0\n2026-11-04,120,7\n');
  });

  it('writes only the header for a campaign that hasn’t started', () => {
    expect(campaignReportCsv([])).toBe('day,impressions,clicks\n');
  });
});

describe('campaignReportFileName', () => {
  it('names the file after the campaign without accents or spaces, and its last day', () => {
    expect(campaignReportFileName('Poezie, sponsorizată', '2026-11-04')).toBe(
      'sponsor-report-poezie-sponsorizata-2026-11-04.csv',
    );
  });

  it('still gives a name when the campaign’s name has no letters and the report no days', () => {
    expect(campaignReportFileName('!!!', '')).toBe('sponsor-report-campaign.csv');
  });
});
