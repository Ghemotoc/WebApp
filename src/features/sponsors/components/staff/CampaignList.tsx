/**
 * CampaignList: the table of every campaign on Staff › Sponsors (story S1-E12-02 criterion 1;
 * board AdminSponsors "Campaigns").
 *
 * Each row names the campaign (a link to its editor), its sponsor, placement, the pages it
 * matches, its dates and its status ("Live" when approved and showing today). The table scrolls
 * inside its own box on a phone, so the page never scrolls sideways.
 * Who shows it: StaffSponsorsPage. What it calls: nothing; the page passes the campaigns.
 */
import { Link } from 'react-router';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import type { StaffCampaign } from '@/schemas/sponsors';

import { useCampaignDatesInWords } from '../../hooks/useCampaignDatesInWords';
import { campaignStatusOf } from '../../lib/sponsorWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

/** The pill colour for each status. */
const statusTones: Record<string, PillTone> = {
  live: 'sage',
  approved: 'sky',
  in_review: 'gold',
  sent_back: 'blush',
  draft: 'neutral',
  ended: 'neutral',
};

/**
 * The pages a campaign matches, in words.
 *
 * @returns for example "fiction · ro", or "Any page"
 */
function useMatchesInWords() {
  const { t } = useSponsorTranslation();
  return (campaign: StaffCampaign) => {
    const parts = [
      ...campaign.target_categories.map((slug) => t(`categories.${slug}`, { ns: 'writing' })),
      ...campaign.target_tags,
      ...campaign.target_languages.map((code) => t(`languages.${code}`, { ns: 'writing' })),
    ];
    return parts.length === 0 ? t('campaigns.anyPage') : parts.join(' · ');
  };
}

/** One row. */
function CampaignRow({ campaign }: { campaign: StaffCampaign }) {
  const { t } = useSponsorTranslation();
  const matchesInWords = useMatchesInWords();
  const datesInWords = useCampaignDatesInWords();
  const status = campaignStatusOf(campaign);
  return (
    <tr className="border-t border-hairline align-top">
      <td className="py-3 pr-4">
        <Link
          to={`/staff/sponsors/campaigns/${campaign.id}`}
          className="font-semibold text-link underline"
        >
          {campaign.name === '' ? t('campaigns.unnamed') : campaign.name}
        </Link>
        <div className="text-meta">{campaign.sponsor_name}</div>
      </td>
      <td className="py-3 pr-4 text-body">{t(`placements.${campaign.placement}`)}</td>
      <td className="py-3 pr-4 text-body">{matchesInWords(campaign)}</td>
      <td className="py-3 pr-4 text-body">{datesInWords(campaign)}</td>
      <td className="py-3">
        <InfoPill tone={statusTones[status] ?? 'neutral'}>{t(`states.${status}`)}</InfoPill>
      </td>
    </tr>
  );
}

/**
 * Renders the table, or a line saying there are no campaigns.
 *
 * @returns the table
 */
export function CampaignList({ campaigns }: { campaigns: StaffCampaign[] }) {
  const { t } = useSponsorTranslation();
  if (campaigns.length === 0) return <p className="m-0 text-body">{t('campaigns.empty')}</p>;
  const columns = ['name', 'placement', 'matches', 'dates', 'status'] as const;
  return (
    <div className="overflow-x-auto" role="region" aria-label={t('campaigns.heading')} tabIndex={0}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{t('campaigns.heading')}</caption>
        <thead>
          <tr className="text-meta">
            {columns.map((column) => (
              <th key={column} scope="col" className="pr-4 pb-2 font-semibold">
                {t(`campaigns.columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign.id} campaign={campaign} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
