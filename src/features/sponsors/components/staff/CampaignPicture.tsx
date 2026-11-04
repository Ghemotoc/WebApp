/**
 * CampaignPicture: a campaign's picture with its check state, for the review card and the
 * campaign form (story S1-E12-02; CLAUDE.md rule 19).
 *
 * Staff who uploaded it, and moderation staff, may read the file at every stage, so it is shown
 * with a line saying where its check stands. A campaign without a picture (a "Sponsored by" line)
 * says so. Who shows it: ReviewCard and CampaignCreativeFields. What it calls: pictureViewOf()
 * for a signed address that lasts an hour.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { pictureViewOf } from '@/features/pictures/api/pictures';
import type { StaffCampaign } from '@/schemas/sponsors';

import { useSponsorTranslation } from '../../registerSponsorTranslations';

/**
 * The campaign's alt text in the screen's language.
 *
 * @returns the alt text, or null when it isn't written yet
 */
function pictureAltOf(campaign: StaffCampaign, language: string): string | null {
  const alt = language === 'ro' ? campaign.alt_ro : campaign.alt_en;
  return alt === '' ? null : alt;
}

/**
 * Renders the picture and its state.
 *
 * @returns the picture block, or the "no picture" line
 */
export function CampaignPicture({ campaign }: { campaign: StaffCampaign }) {
  const { t, i18n } = useSponsorTranslation();
  const picture = campaign.picture;
  // Step 1: a signed address for the file, refreshed with the campaign list.
  const view = useQuery({
    queryKey: ['staff', 'sponsors', 'picture', picture?.path ?? null, picture?.state ?? null],
    queryFn: async () => pictureViewOf(await requireClient(), picture),
    enabled: picture !== null,
  });
  if (picture === null) return <p className="m-0 text-sm text-meta">{t('review.noPicture')}</p>;
  // Step 2: the alt text in the screen's language describes it.
  const alt = pictureAltOf(campaign, i18n.language) ?? t('picture.alt');
  const url = view.data?.url ?? null;
  return (
    <figure className="m-0 flex flex-col gap-2">
      {url !== null && (
        <img
          src={url}
          alt={alt}
          className="max-h-[200px] w-full max-w-[600px] rounded-xl border border-hairline object-contain"
        />
      )}
      <figcaption className="text-sm text-meta">{t(`picture.${picture.state}`)}</figcaption>
    </figure>
  );
}
