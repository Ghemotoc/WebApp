/**
 * PlacementsSection: Staff › Sponsors › Placements (story S1-E12-05; board AdminSponsors
 * "Placements").
 *
 * What it shows, top to bottom: how each slot is filled (the fill order the server uses), the
 * slot inventory for the next six weeks, the notes under it, the booking form, the bookings that
 * stand and our own house ads. Plain staff components, no doodles (Definition of Done).
 * Who shows it: StaffSponsorsPage. What it calls: usePlacementsData(), useSponsorsData() for the
 * campaigns and categories, and the components in this folder.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import { usePlacementsData } from '../../../hooks/usePlacements';
import { useSponsorsData } from '../../../hooks/useSponsorsAdmin';
import { bookableCampaigns, romanianToday } from '../../../lib/placementWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';

import { BookingList } from './BookingList';
import { BookSlotForm } from './BookSlotForm';
import { HouseAdsSection } from './HouseAdsSection';
import { PlacementGrid } from './PlacementGrid';

/** The four steps of the fill order, numbered as on the board. */
const fillOrder = ['booked', 'house', 'network', 'fallback'] as const;

/** "How each slot is filled": the server's order, in words. */
function FillOrder() {
  const { t } = useSponsorTranslation();
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('inventory.orderHeading')}
      </h3>
      <ol className="m-0 flex flex-col gap-2 pl-6 text-body">
        {fillOrder.map((step) => (
          <li key={step}>{t(`inventory.order.${step}`)}</li>
        ))}
      </ol>
      <p className="m-0 text-sm text-meta">{t('inventory.classNote')}</p>
    </div>
  );
}

/** The grid's notes: what Free means and the contest page question that is still open. */
function GridNotes() {
  const { t } = useSponsorTranslation();
  return (
    <ul className="m-0 flex flex-col gap-1 pl-5 text-[13px] text-meta">
      <li>{t('inventory.freeNote')}</li>
      <li>{t('inventory.contestOpen')}</li>
    </ul>
  );
}

/**
 * Renders the section once the inventory has arrived.
 *
 * @returns the Placements section
 */
export function PlacementsSection() {
  const { t } = useSponsorTranslation();
  const { placements, houseAds } = usePlacementsData();
  const { campaigns, categories } = useSponsorsData();
  const inventory = placements.data;
  return (
    <section aria-labelledby="placements-heading" className="flex flex-col gap-5">
      <div className="flex max-w-[720px] flex-col gap-1">
        <Eyebrow>{t('inventory.eyebrow')}</Eyebrow>
        <h2 id="placements-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
          {t('inventory.heading')}
        </h2>
        <p className="m-0 text-body">{t('inventory.intro')}</p>
      </div>
      <FillOrder />
      {placements.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
      {inventory !== undefined && (
        <>
          <h3 className="m-0 font-heading text-lg font-bold text-heading">
            {t('inventory.gridHeading')}
          </h3>
          <PlacementGrid placements={inventory} />
          <GridNotes />
          {campaigns.data !== undefined && (
            <BookSlotForm
              campaigns={bookableCampaigns(campaigns.data, romanianToday())}
              slots={inventory.slots}
              categorySlugs={categories.data ?? []}
            />
          )}
          <BookingList bookings={inventory.bookings} />
          {houseAds.isError && <Notice tone="error">{t('loadFailed')}</Notice>}
          {houseAds.data !== undefined && (
            <HouseAdsSection houseAds={houseAds.data} slots={inventory.slots} />
          )}
        </>
      )}
    </section>
  );
}
