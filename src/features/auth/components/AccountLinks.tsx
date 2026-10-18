/**
 * AccountLinks: the top bar's account links (story S1-E2-01; S1-E2-04 adds Settings; S1-E2-05
 * adds "Log in" and the account button for signed-in people).
 *
 * Signed out, it shows "Join for free" as the board's dark pill (design/boards/Main.dc.html), linking
 * to /sign-up. Signed in, it shows a "Settings" link (S1-E2-04) until S1-E2-05's account button
 * replaces it. Only links to pages that exist are shown (docs/board-fixes.md).
 * Who uses it: AppLayout, in the top bar's end slot, after the language drop-down.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useSession } from '../hooks/useSession';

/**
 * Renders the links for the person's state.
 *
 * @returns "Join for free" when signed out; "Settings" when signed in; nothing while unknown
 */
export function AccountLinks() {
  const { t } = useTranslation();
  const { userId, isKnown } = useSession();
  if (!isKnown) return null;
  if (userId !== null) {
    return (
      <Link
        to="/settings"
        className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold whitespace-nowrap text-heading no-underline hover:bg-tint"
      >
        {t('nav.settings')}
      </Link>
    );
  }
  return (
    <Link
      to="/sign-up"
      className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold whitespace-nowrap text-on-primary no-underline hover:opacity-90"
    >
      {t('nav.join')}
    </Link>
  );
}
