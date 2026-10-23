/**
 * StaffLayout: the frame around every admin page: skip link, staff bar, the page, staff footer
 * (story S1-E11-01; architecture 1.8.1 and 1.8.2).
 *
 * Who uses it: the router wraps every /staff route in it (src/app/router.tsx); the page itself
 * appears where <Outlet /> is. It is loaded on its own, so staff code never ships in the reader's
 * bundle (architecture 1.8.1).
 * What it shows: for a person with a staff role, the bar with only the areas the database allows
 * them (useMyStaffAccess → my_staff_areas()) and the page. For a visitor or a member, the
 * "This part is for staff" page instead of any staff page. The server refuses everything on its
 * own as well: every staff read and write goes through policies and admin_* functions that ask
 * staff_may(); this frame only keeps a member from seeing empty staff screens.
 * What it calls: useMyStaffAccess, staffAreas.ts (which areas have a page).
 */
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router';

import { StaffBar } from '@/app/shell/StaffBar';
import { signOutHere } from '@/features/auth/api/signIn';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { useAccountLanguage } from '@/features/language/hooks/useAccountLanguage';
import { getSupabaseClient } from '@/lib/supabase';

import { useMyStaffAccess } from '../hooks/useMyStaffAccess';
import { registerStaffTranslations } from '../registerStaffTranslations';
import { pagesForAreas } from '../staffAreas';

import { StaffAccessRefused } from './StaffAccessRefused';
import { StaffFooter } from './StaffFooter';

/**
 * The roles under the person's name, for example "Owner · Admin".
 *
 * @param roles - the roles the person holds
 * @param t - the "staff" translator
 * @returns the joined role names
 */
function roleLabel(roles: string[], t: (key: string) => string): string {
  return roles.map((role) => t(`roleNames.${role}`)).join(' · ');
}

/**
 * Renders the frame and the current staff page inside it.
 *
 * @returns the admin site's layout
 */
export function StaffLayout() {
  const { t, i18n } = useTranslation();
  registerStaffTranslations(i18n);
  const { t: tStaff } = useTranslation('staff');
  const navigate = useNavigate();
  const { access, isKnown, isSignedIn } = useMyStaffAccess();
  // Show a signed-in person's account language, whichever device they are on (S1-E1-04).
  useAccountLanguage();

  /** Signs this device out and goes to the public home page. */
  async function signOut() {
    const client = await getSupabaseClient();
    if (client !== null) await signOutHere(client);
    void navigate('/');
  }

  // Step 1: wait until Supabase has said who is signed in, so the page never flashes.
  if (!isKnown) return null;

  // Step 2: a visitor or a member sees the refusal page, with no staff bar at all.
  const isStaff = access.roles.length > 0;
  if (!isStaff) {
    return <StaffAccessRefused reason={isSignedIn ? 'not_staff' : 'signed_out'} />;
  }

  // Step 3: staff get the bar with their own areas, the page and the footer.
  const menuItems = pagesForAreas(access.areas.map((area) => area.area));
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      <StaffBar
        navigationItems={menuItems.map((page) => ({
          href: page.href,
          labelKey: `staff:${page.labelKey}`,
        }))}
        staffName={access.handle === null ? tStaff('shell.noHandle') : `@${access.handle}`}
        roleLabel={roleLabel(access.roles, tStaff)}
        onSignOut={() => void signOut()}
        endSlot={<LanguageSelect id="language-select-staff-top" />}
      />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <StaffFooter menuItems={menuItems} />
    </div>
  );
}
