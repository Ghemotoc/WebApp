/**
 * GreetingHeading: Discover's heading for someone signed in (stories S1-E2-13 and S1-E5-12,
 * bundle LOOK-4b; board Discover, "Personal greeting").
 *
 * The heading is "Good morning, Lia." by the reader's own clock (the board's rule: nothing about
 * place is used), with the board's gold underline drawn under the name. All through their
 * birthday month it says "Happy birthday month" (the month only since QA-7: no birthday day is
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
 * The name with the board's hand-drawn gold line under it. The line is decoration only.
 *
 * @param props.children - the name, filled in by Trans
 * @returns the marked name
 */
function MarkedName({ children }: { children?: ReactNode }) {
  return (
    <span className="relative isolate inline-block">
      {children}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.12em] left-[-2%] -z-10 h-[0.24em] w-[104%] overflow-visible"
      >
        <path
          d="M1 13 C 22 5 48 9 70 12 C 81 13 90 14 99 8"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
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
  // Step 2: the eyebrow, then the heading with the name marked.
  return (
    <>
      <Eyebrow>{t('discover.eyebrowDated', { date: todayWords(i18n.language) })}</Eyebrow>
      <h1 className={className}>
        <Trans
          t={t}
          i18nKey={key}
          values={{ name, productName: brand.productName }}
          components={{ name: <MarkedName /> }}
        />
      </h1>
    </>
  );
}
