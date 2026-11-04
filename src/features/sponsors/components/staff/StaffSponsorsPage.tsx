/**
 * StaffSponsorsPage: Staff › Sponsors (story S1-E12-02; bundle SPONSORS-b2; board AdminSponsors).
 *
 * What it shows, top to bottom: the four rules sponsors follow, every campaign with "New
 * campaign", the review queue, Placements (the slot inventory, booking and our own house ads,
 * part e2), the sponsors and what we never advertise. Plain staff components, no doodles
 * (Definition of Done, design rules). Each campaign's report is on its own page (part c).
 * Who shows it: the router, at /staff/sponsors (owner and admin; the server refuses everyone
 * else). What it calls: useSponsorsData() and the sections in this folder.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useSponsorsData } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { BlockedCategoriesSection } from './BlockedCategoriesSection';
import { CampaignList } from './CampaignList';
import { PlacementsSection } from './placements/PlacementsSection';
import { ReviewQueue } from './ReviewQueue';
import { SponsorPrinciples } from './SponsorPrinciples';
import { SponsorsSection } from './SponsorsSection';

/** The Campaigns section: the table and "New campaign". */
function CampaignsSection() {
  const { t } = useSponsorTranslation();
  const { campaigns } = useSponsorsData();
  return (
    <section aria-labelledby="campaigns-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="campaigns-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
          {t('campaigns.heading')}
        </h2>
        <Link
          to="/staff/sponsors/campaigns/new"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          {t('campaigns.new')}
        </Link>
      </div>
      {campaigns.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
      {campaigns.data !== undefined && <CampaignList campaigns={campaigns.data} />}
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the Sponsors screen
 */
export function StaffSponsorsPage() {
  const { t } = useSponsorTranslation();
  const { campaigns, sponsors, blocked } = useSponsorsData();
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-7">
      <title>{t('documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('heading')}</h1>
        <p className="m-0 text-body">{t('intro')}</p>
      </div>
      <SponsorPrinciples />
      <div className="flex max-w-[960px] flex-col gap-10">
        <CampaignsSection />
        {campaigns.data !== undefined && <ReviewQueue campaigns={campaigns.data} />}
        <PlacementsSection />
        {sponsors.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
        {sponsors.data !== undefined && <SponsorsSection sponsors={sponsors.data} />}
        {blocked.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
        {blocked.data !== undefined && <BlockedCategoriesSection categories={blocked.data} />}
      </div>
    </PageContainer>
  );
}
