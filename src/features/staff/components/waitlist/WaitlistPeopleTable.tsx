/**
 * WaitlistPeopleTable: the people still waiting who fit the filters, oldest first, with a tick
 * box each and "Let in selected" (bundle WAITLIST-1).
 *
 * Columns: the username (with the pen name), what they come for, the country, the day they
 * joined and whether they confirmed their email. Never the user ID or the email (CLAUDE.md
 * rule 15). Rows have a fine line between them (DoD label rows); the table scrolls inside its own
 * box on a phone, never the page.
 * Who shows it: StaffWaitlistPage. What it calls: nothing; the page keeps the ticks.
 */
import { useTranslation } from 'react-i18next';

import type { WaitingPerson } from '@/features/waitlist/api/waitlist';

import { countryName } from './countryName';

/** What the table needs. */
interface WaitlistPeopleTableProps {
  people: WaitingPerson[];
  ticked: string[];
  onToggle: (entryId: string) => void;
}

/**
 * The words one row shows: the name, the country, the date they joined and the email's state.
 *
 * @param person - one person waiting
 * @returns the texts, already in the interface language
 */
function usePersonTexts(person: WaitingPerson) {
  const { t, i18n } = useTranslation('staff');
  return {
    // A pen name when there is one, else the username; the username line shows only beside a pen
    // name, so it is never said twice.
    name: person.display_name ?? person.handle ?? t('waitlist.noName'),
    // A person whose country isn't open yet can't be let in until it opens (MARKETS-2b).
    country: person.market_open
      ? countryName(person.country, i18n.language, t)
      : t('waitlist.table.countryClosed', {
          country: countryName(person.country, i18n.language, t),
        }),
    joined: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(person.joined_at),
    ),
    email: person.email_confirmed
      ? t('waitlist.table.confirmed')
      : t('waitlist.table.notConfirmed'),
  };
}

/**
 * One person's row. On a phone the country, date and email state sit under the name instead of in
 * their own columns, so nothing is cut off at 390 px (CLAUDE.md rule 21).
 *
 * @returns the row
 */
function PersonRow({
  person,
  isTicked,
  onToggle,
}: {
  person: WaitingPerson;
  isTicked: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('staff');
  const texts = usePersonTexts(person);
  const wideCell = 'hidden py-2.5 pr-4 text-body md:table-cell';
  return (
    <tr className="border-b border-hairline">
      <td className="py-2.5 pr-3">
        <input
          type="checkbox"
          checked={isTicked}
          onChange={onToggle}
          aria-label={t('waitlist.table.tick', { name: texts.name })}
          className="size-6 cursor-pointer accent-(--link)"
        />
      </td>
      <th scope="row" className="py-2.5 pr-4 text-left font-semibold text-ink">
        {texts.name}
        {person.display_name !== null && person.handle !== null && (
          <span className="block text-sm font-normal text-meta">@{person.handle}</span>
        )}
        <span className="block text-sm font-normal text-meta md:hidden">
          {texts.country} · {texts.joined} · {texts.email}
        </span>
      </th>
      <td className="py-2.5 pr-4 text-body">{t(`waitlist.interest.${person.interest}`)}</td>
      <td className={wideCell}>{texts.country}</td>
      <td className={wideCell}>{texts.joined}</td>
      <td className="hidden py-2.5 text-body md:table-cell">{texts.email}</td>
    </tr>
  );
}

/**
 * Renders the table, or a line saying nobody fits.
 *
 * @returns the table
 */
export function WaitlistPeopleTable({ people, ticked, onToggle }: WaitlistPeopleTableProps) {
  const { t } = useTranslation('staff');
  if (people.length === 0) return <p className="m-0 text-body">{t('waitlist.table.empty')}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">{t('waitlist.table.caption')}</caption>
        <thead>
          <tr className="border-b border-hairline text-left text-[13px] font-semibold text-meta">
            <th scope="col" className="py-2 pr-3">
              <span className="sr-only">{t('waitlist.table.tickColumn')}</span>
            </th>
            <th scope="col" className="py-2 pr-4">
              {t('waitlist.table.person')}
            </th>
            <th scope="col" className="py-2 pr-4">
              {t('waitlist.table.interest')}
            </th>
            <th scope="col" className="hidden py-2 pr-4 md:table-cell">
              {t('waitlist.table.country')}
            </th>
            <th scope="col" className="hidden py-2 pr-4 md:table-cell">
              {t('waitlist.table.joined')}
            </th>
            <th scope="col" className="hidden py-2 md:table-cell">
              {t('waitlist.table.email')}
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <PersonRow
              key={person.entry_id}
              person={person}
              isTicked={ticked.includes(person.entry_id)}
              onToggle={() => onToggle(person.entry_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
