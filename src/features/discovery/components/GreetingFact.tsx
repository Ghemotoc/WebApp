/**
 * GreetingFact: the greeting in the Read page's meta line, for someone signed in (stories
 * S1-E2-13 and S1-E5-12; since CALM-7c the simplified board New-Read, which titles the page
 * "Read").
 *
 * It reads "Good morning, Lia." by the reader's own clock (nothing about place is used). All
 * through their birthday month it says "Happy birthday month" (the month only since QA-7: no
 * birthday day is stored, CLAUDE.md rule 5) and in the month they joined, from the first
 * anniversary on, "Happy <product> anniversary" (Robert, 25 Oct 2026). The birthday month wins
 * over the anniversary. The name is the pen name, or the username when there is none; never a
 * real name (rule 5). Before CALM-7c this was the page's h1; the board makes "Read" the title, so
 * the greeting moved into the line under it and keeps every special day.
 * Who shows it: ReadHeader, only once the name is known. What it calls: useMyGreeting (which
 * greeting today) and lib/greeting (the text key). The wording is interface text in
 * discovery.json (admins may override it with S1-E11-18).
 */
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useMyGreeting } from '@/features/account/hooks/useMyGreeting';
import { brand } from '@/config/brand';

import { greetingKeyFor } from '../lib/greeting';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * The name inside the greeting, as plain text (the gold line under it was a doodle, G7).
 *
 * @param props.children - the name, filled in by Trans
 * @returns the name
 */
function GreetingName({ children }: { children?: ReactNode }) {
  return <span>{children}</span>;
}

/**
 * Renders the greeting as one item of a meta line.
 *
 * @param props.name - the pen name, or the username
 * @returns the list item
 */
export function GreetingFact({ name }: { name: string }) {
  const { t } = useDiscoveryTranslation();
  const greeting = useMyGreeting();
  // Step 1: the special greeting if there is one today, else the time of day.
  const key = greetingKeyFor(greeting?.kind ?? null, new Date().getHours());
  // Step 2: the words, with the name filled in.
  return (
    <li>
      <Trans
        t={t}
        i18nKey={key}
        values={{ name, productName: brand.productName }}
        components={{ name: <GreetingName /> }}
      />
    </li>
  );
}
