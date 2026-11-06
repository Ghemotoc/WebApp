/**
 * BookingList: every booking that stands, under the grid, each with "Cancel booking" (story
 * S1-E12-05 criteria 2 and 7).
 *
 * Cancelling asks why, because the reason goes into the audit log, and frees the slot on those
 * days. Each row is a label and its values, with a fine line between rows (DoD design rules).
 * The outcome shows above the list, because a cancelled booking leaves it.
 * Who shows it: PlacementsSection. What it calls: usePlacementChanges() and ChangeOutcome.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import type { AdBooking } from '@/schemas/adPlacements';

import { usePlacementChanges } from '../../../hooks/usePlacements';
import { sponsorDayInWords } from '../../../lib/sponsorWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';
import { ChangeOutcome } from '../ChangeOutcome';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The pages a booking matches, in words: "Poetry · ro", or "Any page". */
function useBookingPagesInWords() {
  const { t } = useSponsorTranslation();
  return (booking: AdBooking) => {
    const parts = [
      ...booking.target_categories.map((slug) => t(`categories.${slug}`, { ns: 'writing' })),
      ...booking.target_tags,
      ...booking.target_languages.map((code) => t(`languages.${code}`, { ns: 'writing' })),
    ];
    return parts.length === 0 ? t('booking.anyPage') : parts.join(' · ');
  };
}

/** The list's one set of changes, shared so the outcome outlives the cancelled row. */
type PlacementChanges = ReturnType<typeof usePlacementChanges>;

/** "Cancel booking", then the reason and the confirmation. */
function CancelBooking({ booking, changes }: { booking: AdBooking; changes: PlacementChanges }) {
  const { t } = useSponsorTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const [reason, setReason] = useState('');
  if (!isAsking) {
    return (
      <div>
        <Button
          variant="destructive"
          aria-label={t('booking.cancelNamed', { campaign: booking.campaign_name })}
          onClick={() => setIsAsking(true)}
        >
          {t('booking.cancel')}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <TextInput
        id={`booking-cancel-${booking.id}`}
        label={t('booking.cancelReason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          disabled={changes.isRunning}
          onClick={() =>
            void changes
              .change({ kind: 'cancel', bookingId: booking.id, reason })
              .catch(errorShownByHook)
          }
        >
          {t('booking.confirmCancel')}
        </Button>
        <Button variant="secondary" onClick={() => setIsAsking(false)}>
          {t('booking.keep')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the list, or a line saying nothing is booked.
 *
 * @param props.bookings - the bookings that stand, from admin_ad_placements()
 * @returns the section
 */
export function BookingList({ bookings }: { bookings: AdBooking[] }) {
  const { t, i18n } = useSponsorTranslation();
  const pagesInWords = useBookingPagesInWords();
  // One set of changes for the list: a cancelled row disappears, its outcome stays above.
  const changes = usePlacementChanges();
  const dates = (booking: AdBooking) =>
    t('campaigns.dates', {
      from: sponsorDayInWords(booking.starts_on, i18n.language),
      to: sponsorDayInWords(booking.ends_on, i18n.language),
    });
  return (
    <section aria-labelledby="bookings-heading" className="flex flex-col gap-3">
      <h3 id="bookings-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('booking.listHeading')}
      </h3>
      <ChangeOutcome
        successText={t('booking.cancelled')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
      {bookings.length === 0 ? (
        <p className="m-0 text-body">{t('booking.listEmpty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-col gap-2 border-t border-hairline py-3 first:border-t-0"
            >
              <span className="font-semibold text-heading">
                {t('booking.listItem', {
                  campaign: booking.campaign_name,
                  sponsor: booking.sponsor_name,
                })}
              </span>
              <span className="text-sm text-body">
                {t('booking.listWhere', {
                  slot: t(`inventory.slots.${booking.slot_key}`),
                  dates: dates(booking),
                })}
              </span>
              <span className="text-sm text-meta">{pagesInWords(booking)}</span>
              <CancelBooking booking={booking} changes={changes} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
