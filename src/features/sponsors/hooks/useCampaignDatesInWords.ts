/**
 * useCampaignDatesInWords: a campaign's dates as words in the screen's language (story S1-E12-02;
 * bundle SPONSORS-b2).
 *
 * Who calls it: CampaignList and ReviewQueue. What it calls: lib/sponsorWords.ts.
 */
import type { StaffCampaign } from '@/schemas/sponsors';

import { sponsorDayInWords } from '../lib/sponsorWords';
import { useSponsorTranslation } from '../registerSponsorTranslations';

/**
 * A campaign's dates, in words.
 *
 * @returns for example "4 Nov 2026 to 11 Nov 2026", or "Not set"
 */
export function useCampaignDatesInWords() {
  const { t, i18n } = useSponsorTranslation();
  return (campaign: StaffCampaign) => {
    if (campaign.starts_on === null || campaign.ends_on === null) return t('campaigns.noDates');
    return t('campaigns.dates', {
      from: sponsorDayInWords(campaign.starts_on, i18n.language),
      to: sponsorDayInWords(campaign.ends_on, i18n.language),
    });
  };
}
