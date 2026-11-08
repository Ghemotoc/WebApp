/**
 * OpeningListCounts: "Waiting for their country to open" on Staff › Waitlist: how many people
 * asked to hear when each closed country opens (bundle G5, part a; story S1-E2-10). Only numbers,
 * never an address; the emails go out by themselves once a country opens.
 *
 * Who shows it: StaffWaitlistPage, under the waiting list. Plain staff components, no doodles.
 * What it calls: api/staffOpeningList.ts.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { countryName } from '@/features/safety/lib/countries';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchOpeningListCounts, type OpeningListCount } from '../../api/staffOpeningList';

/**
 * Reads the counts once the page opens.
 *
 * @returns the query
 */
function useOpeningListCounts() {
  return useQuery<OpeningListCount[]>({
    queryKey: ['staff', 'opening-list-counts'],
    queryFn: async () => {
      const client = await getSupabaseClient();
      return client === null ? [] : fetchOpeningListCounts(client);
    },
    retry: false,
  });
}

/**
 * The table of countries and their numbers.
 *
 * @returns the table
 */
function CountsTable({ counts }: { counts: OpeningListCount[] }) {
  const { t, i18n } = useTranslation('staff');
  return (
    <table className="w-full border-collapse text-left text-[15px]">
      <thead>
        <tr className="border-b border-hairline">
          <th scope="col" className="py-2 pr-4 font-semibold text-ink">
            {t('waitlist.openingList.country')}
          </th>
          <th scope="col" className="py-2 pr-4 font-semibold text-ink">
            {t('waitlist.openingList.confirmed')}
          </th>
          <th scope="col" className="py-2 font-semibold text-ink">
            {t('waitlist.openingList.unconfirmed')}
          </th>
        </tr>
      </thead>
      <tbody>
        {counts.map((row) => (
          <tr key={row.countryCode} className="border-b border-hairline">
            <td className="py-2 pr-4 text-body">{countryName(row.countryCode, i18n.language)}</td>
            <td className="py-2 pr-4 text-body">{row.confirmed}</td>
            <td className="py-2 text-body">{row.unconfirmed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, a line on what it is, and the table (or why there is none)
 */
export function OpeningListCounts() {
  const { t } = useTranslation('staff');
  const counts = useOpeningListCounts();
  return (
    <section aria-labelledby="opening-list-heading" className="flex flex-col gap-3">
      <h2 id="opening-list-heading" className="m-0 font-heading text-xl font-semibold text-heading">
        {t('waitlist.openingList.heading')}
      </h2>
      <p className="m-0 text-body">{t('waitlist.openingList.intro')}</p>
      {counts.isError && <Notice tone="error">{t('waitlist.openingList.loadFailed')}</Notice>}
      {counts.data !== undefined && counts.data.length === 0 && (
        <p className="m-0 text-body">{t('waitlist.openingList.none')}</p>
      )}
      {counts.data !== undefined && counts.data.length > 0 && <CountsTable counts={counts.data} />}
    </section>
  );
}
