/**
 * ReadHeader: the top of the Read page (stories S1-E5-01 and S1-E5-12; since CALM-7c the
 * simplified board New-Read).
 *
 * What it shows: the title "Read" in the display style, then one meta line with today's date and,
 * for someone signed in, the greeting ("Good morning, Lia.", or the birthday month or anniversary
 * greeting) and how many stories by writers they follow were updated this week. Under it one line
 * says nothing on the page is picked from what the reader reads, with "How ranking works" (the
 * terms' ranking section, DSA art. 27; S1-E5-03), which the board leaves out but the law needs.
 * Who shows it: DiscoverPage. What it calls: useMyNames (the name), GreetingFact and
 * FollowedUpdatesFact.
 */
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import { dateLocaleFor } from '@/lib/romania-time';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { FollowedUpdatesFact } from './FollowedUpdatesFact';
import { GreetingFact } from './GreetingFact';

/**
 * Today's date written the reader's way ("Sunday 22 November", "duminică, 22 noiembrie").
 *
 * @param language - the interface language
 * @returns the date words
 */
function todayWords(language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

/**
 * Renders the header.
 *
 * @returns the header
 */
export function ReadHeader() {
  const { t, i18n } = useDiscoveryTranslation();
  const { names } = useMyNames();
  // The pen name, or the username; null for a visitor or while it loads (rule 5: no real name).
  const name = names === null ? null : displayName(names.handle, names.penName);
  return (
    <header className="flex flex-col gap-3">
      <h1 className="m-0 type-display">{t('discover.title')}</h1>
      {/* One meta line: the date first, then the member's own facts (CSS draws the middots). */}
      <ul className="meta-line">
        <li>{todayWords(i18n.language)}</li>
        {name !== null && <GreetingFact name={name} />}
        {name !== null && <FollowedUpdatesFact />}
      </ul>
      <p className="m-0 max-w-[62ch] type-body text-ink-muted">
        {t('discover.intro', { productName: brand.productName })}{' '}
        <Link to="/legal/terms#section-5" className="font-semibold underline underline-offset-2">
          {t('discover.howRanking')}
        </Link>
      </p>
    </header>
  );
}
