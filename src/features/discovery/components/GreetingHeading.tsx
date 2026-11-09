/**
 * GreetingHeading: Discover's heading for someone signed in (stories S1-E2-13 and S1-E5-12,
 * bundle LOOK-4b; board Discover, "Personal greeting").
 *
 * The heading is "Good morning, Lia." by the reader's own clock (the board's rule: nothing about
 * place is used), with the name as plain heading text (G7: the gold underline was a doodle and
 * is gone). All through their birthday month it says "Happy birthday month" (the month only since QA-7: no birthday day is
 * stored, CLAUDE.md rule 5) and in the month they joined, from the first anniversary on, "Happy
 * <product> anniversary" (Robert, 25 Oct 2026). The birthday month wins over the anniversary.
 * The name is the pen name, or the username when there is none; never a real name (rule 5).
 * The eyebrow above it reads "Discover · Friday 6 November", in the reader's language.
 * Who shows it: DiscoverPage, only once the name is known (otherwise the visitor's heading shows).
 * What it calls: useMyGreeting (which greeting today) and lib/greeting (the text key). The wording
 * is interface text in discovery.json (admins may override it with S1-E11-18).
 */
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { useMyGreeting } from '@/features/account/hooks/useMyGreeting';
import { brand } from '@/config/brand';
import { dateLocaleFor } from '@/lib/romania-time';

import { greetingKeyFor } from '../lib/greeting';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * The name inside the greeting. Bundle G7 dropped the hand-drawn gold line under it, which
 * counted as a doodle (G4: no doodles anywhere); the name now reads as plain heading text.
 *
 * @param props.children - the name, filled in by Trans
 * @returns the name
 */
function GreetingName({ children }: { children?: ReactNode }) {
  return <span>{children}</span>;
}

/**
 * Today's date for the eyebrow, written the reader's way ("Friday 6 November", "vineri, 6
 * noiembrie").
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
 * Renders the eyebrow and the heading.
 *
 * @param props.name - the pen name, or the username
 * @param props.className - the heading's type, shared with the visitor's heading
 * @returns the eyebrow and the h1
 */
export function GreetingHeading({ name, className }: { name: string; className: string }) {
  const { t, i18n } = useDiscoveryTranslation();
  const greeting = useMyGreeting();
  // Step 1: the special greeting if there is one today, else the time of day.
  const key = greetingKeyFor(greeting?.kind ?? null, new Date().getHours());
  // Step 2: the eyebrow, then the heading with the name.
  return (
    <>
      <Eyebrow>{t('discover.eyebrowDated', { date: todayWords(i18n.language) })}</Eyebrow>
      <h1 className={className}>
        <Trans
          t={t}
          i18nKey={key}
          values={{ name, productName: brand.productName }}
          components={{ name: <GreetingName /> }}
        />
      </h1>
    </>
  );
}
