/**
 * StaffLayout: the frame around every admin page: skip link, staff bar, the grouped side menu
 * beside the page, staff footer (story S1-E11-01; side menu DASH-1; architecture 1.8.1 and 1.8.2).
 *
 * Who uses it: the router wraps every /staff route in it (src/app/router.tsx); the page itself
 * appears where <Outlet /> is. It is loaded on its own, so staff code never ships in the reader's
 * bundle (architecture 1.8.1).
 * What it shows: for a person with a staff role, the bar, the side menu with only the areas the
 * database allows them (useMyStaffAccess → my_staff_areas()) and the page. For a visitor or a member, the
 * "This part is for staff" page instead of any staff page. For a staff member whose session isn't
 * a Google Workspace sign-in once the staff domain is set (S1-E2-07b), the page that asks them to
 * sign in with Google (StaffWorkspaceSignIn). For a staff member whose 12-hour staff session has
 * run out, the "Sign in again" page (StaffSessionEnded, DASH-1). The server refuses everything on its
 * own as well: every staff read and write goes through policies and admin_* functions that ask
 * staff_may(); this frame only keeps a member from seeing empty staff screens.
 * What it calls: useMyStaffAccess, staffAreas.ts (which areas have a page), StaffSideMenu,
 * StaffAccessRefused, StaffWorkspaceSignIn and StaffSessionEnded.
 */
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router';

import { StaffBar } from '@/app/shell/StaffBar';
import { BrandTabIcon } from '@/features/branding/components/BrandTabIcon';
import { signOutHere } from '@/features/auth/api/signIn';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { useAccountLanguage } from '@/features/language/hooks/useAccountLanguage';
import { useAccountAppearance } from '@/features/theme/hooks/useAccountAppearance';
import { SafetyContactWarningBanner } from '@/features/safety/components/SafetyContactWarningBanner';
import { getSupabaseClient } from '@/lib/supabase';

import { useMyStaffAccess } from '../hooks/useMyStaffAccess';
import { registerStaffTranslations } from '../registerStaffTranslations';
import { pagesForAreas } from '../staffAreas';

import { StaffAccessRefused } from './StaffAccessRefused';
import { StaffFooter } from './StaffFooter';
import { StaffSessionEnded } from './StaffSessionEnded';
import { StaffSideMenu } from './StaffSideMenu';
import { StaffWorkspaceSignIn } from './StaffWorkspaceSignIn';

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
  // The member's mode and look, from their account on every device (bundle G2).
  useAccountAppearance();

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

  // Step 3: staff whose session isn't a Google Workspace sign-in are asked for one first
  // (S1-E2-07b); until then the server allows them no staff action anyway.
  if (access.workspace.isNeeded && access.workspace.domain !== null) {
    return (
      <StaffWorkspaceSignIn
        domain={access.workspace.domain}
        isConnected={access.workspace.isConnected}
      />
    );
  }

  // Step 4: staff whose 12-hour session ran out are asked to sign in again (DASH-1), instead of
  // an admin site with no area open.
  if (access.sessionEnded) return <StaffSessionEnded />;

  // Step 5: staff get the bar, the side menu with their own areas, the page and the footer.
  const menuItems = pagesForAreas(access.areas.map((area) => area.area));
  // data-area="staff" swaps in the staff area's flat beige colours (src/styles/tokens.css; bundle
  // G1), and bg-paper paints them over the member background's colour blobs.
  return (
    <div data-area="staff" className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-surface-solid px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      {/* The approved emblem in the browser tab (BRAND-1b). */}
      <BrandTabIcon />
      <StaffBar
        staffName={access.handle === null ? tStaff('shell.noHandle') : `@${access.handle}`}
        roleLabel={roleLabel(access.roles, tStaff)}
        onSignOut={() => void signOut()}
        endSlot={<LanguageSelect id="language-select-staff-top" />}
      />
      <SafetyContactWarningBanner
        canSee={access.areas.some((area) => area.area === 'safety_contacts')}
      />
      {/* The side menu beside the page from 1024 px; above it, behind "Menu", on smaller screens. */}
      <div className="mx-auto flex w-full max-w-[1408px] flex-1 flex-col lg:flex-row">
        <aside className="px-[clamp(16px,4vw,64px)] pt-6 lg:w-64 lg:shrink-0 lg:pr-0">
          <StaffSideMenu pages={menuItems} />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <Outlet />
        </main>
      </div>
      <StaffFooter menuItems={menuItems} />
    </div>
  );
}
