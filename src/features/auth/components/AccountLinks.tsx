/**
 * AccountLinks: the top bar's account links (story S1-E2-01; S1-E2-05 adds "Log in" and the
 * account button).
 *
 * Signed out, it shows one "Get in" button (GETIN-1; Robert, 13 Nov 2026: two buttons left odd
 * gaps on a phone, and one way in is simpler on every screen). It opens the log-in page, whose
 * "New here? Join for free" line under the form leads to sign-up. This replaces the board's
 * "Log in" link and "Join for free" pill (docs/board-fixes.md). Signed in, it shows AccountMenu (the public
 * profile, Edit profile, Settings, Log out; NAV-1) with the first letter of the person's pen name
 * or username.
 * Who uses it: AppLayout, in the top bar's end slot, after the language drop-down.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';

import { useSession } from '../hooks/useSession';

import { AccountMenu } from './AccountMenu';

/**
 * The name, username and letter the account button and its panel show.
 *
 * @returns the shown name and username (null before a username is chosen) and the first letter
 *   of the name, or "?" before then
 */
function useAccountNames() {
  const { names } = useMyNames();
  const name = names === null ? null : displayName(names.handle, names.penName);
  const handle =
    names === null || names.handle === null || names.handle === '' ? null : names.handle;
  const initial = name === null ? '?' : ([...name][0] ?? '?');
  return { name, handle, initial };
}

/**
 * Renders the links for the person's state.
 *
 * @returns the "Get in" button when signed out; the account button when signed in;
 *   nothing while unknown
 */
export function AccountLinks() {
  const { t } = useTranslation();
  const { userId, isKnown } = useSession();
  const { name, handle, initial } = useAccountNames();
  if (!isKnown) return null;
  if (userId !== null) return <AccountMenu initial={initial} name={name} handle={handle} />;
  // One way in for a visitor: log-in first, with sign-up one line below its form (GETIN-1).
  return (
    <Link
      to="/sign-in"
      className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold whitespace-nowrap no-underline"
    >
      {t('nav.getIn')}
    </Link>
  );
}
