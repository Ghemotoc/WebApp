/**
 * WaitlistFilters: who the list shows and who a wave takes: everyone, writers (write or both) or
 * readers (read or both), and one country or all (bundle WAITLIST-1; "writers first, by country").
 * Countries that aren't open yet are marked (MARKETS-2b, S1-E11-32).
 *
 * Who shows it: StaffWaitlistPage. What it calls: nothing; the page keeps the filters
 * (useStaffWaitlist). Drop-downs follow the one Select style (DoD design rules).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import type { StaffWaitlist, WaitlistFilter } from '@/features/waitlist/api/waitlist';

import { countryName } from './countryName';

/** What the filters need. */
interface WaitlistFiltersProps {
  interest: WaitlistFilter;
  country: string | null;
  countries: StaffWaitlist['countries'];
  onInterestChange: (interest: WaitlistFilter) => void;
  onCountryChange: (country: string | null) => void;
}

/**
 * Renders the two drop-downs.
 *
 * @returns the filters
 */
export function WaitlistFilters(props: WaitlistFiltersProps) {
  const { t, i18n } = useTranslation('staff');
  const countryOptions = [
    { value: '', label: t('waitlist.filters.allCountries') },
    // A country that isn't open yet says so (MARKETS-2b): its people wait for the market, and
    // the database refuses a wave for it.
    ...props.countries.map((row) => ({
      value: row.country,
      label: row.open
        ? `${countryName(row.country, i18n.language, t)} (${row.waiting})`
        : t('waitlist.filters.countryClosed', {
            country: countryName(row.country, i18n.language, t),
            count: row.waiting,
          }),
    })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Select
        id="waitlist-interest"
        label={t('waitlist.filters.interestLabel')}
        isLabelVisible
        options={[
          { value: '', label: t('waitlist.filters.everyone') },
          { value: 'write', label: t('waitlist.filters.writers') },
          { value: 'read', label: t('waitlist.filters.readers') },
        ]}
        value={props.interest ?? ''}
        onChange={(value) =>
          props.onInterestChange(value === '' ? null : (value as WaitlistFilter))
        }
      />
      <Select
        id="waitlist-country"
        label={t('waitlist.filters.countryLabel')}
        isLabelVisible
        options={countryOptions}
        value={props.country ?? ''}
        onChange={(value) => props.onCountryChange(value === '' ? null : value)}
      />
    </div>
  );
}
