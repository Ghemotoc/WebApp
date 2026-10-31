/**
 * UsersTabs: the tabs of the Users area, Accounts, Manual age checks and Invites (story
 * S1-E11-02; board AdminUsers 8.5; board-fixes: Invites is a tab under Users, decided 17 Oct
 * 2026, 13:01; Manual age checks, S1-E2-08b).
 *
 * Who shows it: UsersPage, ManualAgeChecksPage and InvitesPage. What it reads: useMyStaffAccess,
 * so a tab shows only when the person's role has its area, and Manual age checks only when the
 * role may act on Users (support may only view, and moderators have no Invites tab). The tabs are
 * links (each tab is its own address), marked with aria-current, not an ARIA tab widget.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { useMyStaffAccess } from '../../hooks/useMyStaffAccess';

/** One tab: the area that opens it, its address and its text. */
const usersTabs = [
  { area: 'users', needsAct: false, href: '/staff/users', labelKey: 'users.tabs.accounts' },
  {
    area: 'users',
    needsAct: true,
    href: '/staff/users/age-checks',
    labelKey: 'users.tabs.ageChecks',
  },
  {
    area: 'invites',
    needsAct: false,
    href: '/staff/users/invites',
    labelKey: 'users.tabs.invites',
  },
] as const;

/**
 * Renders the tabs the person may open.
 *
 * @returns the tab row, or nothing when only one tab is open to the person
 */
export function UsersTabs() {
  const { t } = useTranslation('staff');
  const { access } = useMyStaffAccess();
  // A tab shows when the role has its area, with "act" where the tab needs it.
  const tabs = usersTabs.filter((tab) =>
    access.areas.some((area) => area.area === tab.area && (!tab.needsAct || area.access === 'act')),
  );
  if (tabs.length < 2) return null;
  return (
    <nav aria-label={t('users.tabs.label')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 border-b border-border p-0">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <NavLink
              to={tab.href}
              end
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center border-b-2 px-3 font-semibold no-underline ${
                  isActive ? 'border-primary text-heading' : 'border-transparent text-link'
                }`
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
