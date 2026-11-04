/**
 * HouseAdsSection: "Our own promos", the house ads staff wrote (story S1-E12-05 criterion 6;
 * board AdminSponsors "House ads").
 *
 * Each house ad shows its titles in both languages, the page it links to, where and when it runs,
 * "Change" (opens the form in place) and "Take it down" (archives it, logged). "New house ad"
 * opens an empty form above the list.
 * Who shows it: PlacementsSection. What it calls: HouseAdForm, usePlacementChanges().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { HouseAd, PlacementSlot } from '@/schemas/adPlacements';

import { usePlacementChanges } from '../../../hooks/usePlacements';
import { sponsorDayInWords } from '../../../lib/sponsorWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';
import { ChangeOutcome } from '../ChangeOutcome';

import { HouseAdForm } from './HouseAdForm';

/** What one house ad's row needs. */
interface HouseAdItemProps {
  houseAd: HouseAd;
  onEdit: () => void;
  /** The section's changes, shared so "Taken down." outlives the row. */
  changes: ReturnType<typeof usePlacementChanges>;
}

/** One house ad: its words, where it leads, where and when it runs, and its two buttons. */
function HouseAdItem({ houseAd, onEdit, changes }: HouseAdItemProps) {
  const { t, i18n } = useSponsorTranslation();
  const slotName =
    houseAd.slot_key === null ? t('houseAds.anySlot') : t(`inventory.slots.${houseAd.slot_key}`);
  const dates = t('campaigns.dates', {
    from: sponsorDayInWords(houseAd.starts_on, i18n.language),
    to: sponsorDayInWords(houseAd.ends_on, i18n.language),
  });
  return (
    <li className="flex flex-col gap-1.5 border-t border-hairline py-3 first:border-t-0">
      <span lang="en" className="font-semibold text-heading">
        {houseAd.title_en}
      </span>
      <span lang="ro" className="text-body">
        {houseAd.title_ro}
      </span>
      <span className="text-sm text-meta">
        {t('houseAds.linksTo', { path: houseAd.link_path })} ·{' '}
        {t('houseAds.where', { slot: slotName })} · {t('houseAds.runs', { dates })}
      </span>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          aria-label={t('houseAds.editNamed', { title: houseAd.title_en })}
          onClick={onEdit}
        >
          {t('houseAds.edit')}
        </Button>
        <Button
          variant="destructive"
          aria-label={t('houseAds.archiveNamed', { title: houseAd.title_en })}
          disabled={changes.isRunning}
          onClick={() =>
            void changes
              .change({ kind: 'archive_house', houseAdId: houseAd.id })
              .catch(() => undefined)
          }
        >
          {t('houseAds.archive')}
        </Button>
      </div>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @param props.houseAds - every house ad that isn't archived
 * @param props.slots - the slots a house ad can be put in
 * @returns the section
 */
export function HouseAdsSection({
  houseAds,
  slots,
}: {
  houseAds: HouseAd[];
  slots: PlacementSlot[];
}) {
  const { t } = useSponsorTranslation();
  // Which form is open: 'new', a house ad's ID, or null for none.
  const [openForm, setOpenForm] = useState<string | null>(null);
  // Taking one down removes its row, so the outcome shows above the list.
  const changes = usePlacementChanges();
  return (
    <section aria-labelledby="house-ads-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Eyebrow>{t('houseAds.eyebrow')}</Eyebrow>
          <h3
            id="house-ads-heading"
            className="m-0 font-heading text-[22px] font-bold text-heading"
          >
            {t('houseAds.heading')}
          </h3>
        </div>
        <Button variant="secondary" onClick={() => setOpenForm('new')}>
          {t('houseAds.new')}
        </Button>
      </div>
      <p className="m-0 text-sm text-body">{t('houseAds.intro')}</p>
      <ChangeOutcome
        successText={t('houseAds.archived')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
      {openForm === 'new' && (
        <HouseAdForm houseAd={null} slots={slots} onClose={() => setOpenForm(null)} />
      )}
      {houseAds.length === 0 ? (
        <p className="m-0 text-body">{t('houseAds.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {houseAds.map((houseAd) =>
            openForm === houseAd.id ? (
              <li key={houseAd.id} className="py-3">
                <HouseAdForm houseAd={houseAd} slots={slots} onClose={() => setOpenForm(null)} />
              </li>
            ) : (
              <HouseAdItem
                key={houseAd.id}
                houseAd={houseAd}
                onEdit={() => setOpenForm(houseAd.id)}
                changes={changes}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
