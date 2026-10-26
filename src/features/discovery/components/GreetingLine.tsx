/**
 * GreetingLine: the small greeting at the top of Discover for someone signed in (story S1-E2-13,
 * with S1-E2-12; board Discover 3.1's personal greeting).
 *
 * On an ordinary day it says good morning, afternoon or evening by the reader's own clock (the
 * board's rule: nothing about place is used). On their birthday it says "Happy birthday", all
 * through their birthday month "Happy birthday month", and in the month they joined, from the
 * first anniversary on, "Happy <product> anniversary" (Robert, 25 Oct 2026, 07:07 to 07:11). The
 * birthday wins over the anniversary (proposal, in the database).
 * Who shows it: DiscoverPage. What it calls: useMyNames (the pen name, or the username) and
 * useMyGreeting (which greeting today). Signed out, or before the name loads, it shows nothing.
 * The wording is interface text in discovery.json (admins may override it with S1-E11-18).
 */
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useMyGreeting } from '@/features/account/hooks/useMyGreeting';
import { displayName } from '@/features/account/lib/nameRules';

import { greetingKeyFor } from '../lib/greeting';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the line.
 *
 * @returns the greeting, or nothing when nobody is signed in or the name isn't known yet
 */
export function GreetingLine() {
  const { t } = useDiscoveryTranslation();
  const { names } = useMyNames();
  const greeting = useMyGreeting();
  // Step 1: no line without a name (signed out, still loading or no username yet).
  const name = names === null ? null : displayName(names.handle, names.penName);
  if (name === null) return null;
  // Step 2: the special greeting if there is one today, else the time of day.
  const key = greetingKeyFor(greeting?.kind ?? null, new Date().getHours());
  return (
    <p className="m-0 font-heading text-[clamp(20px,2.4vw,28px)] leading-tight font-bold text-heading">
      {t(key, { name })}
    </p>
  );
}
