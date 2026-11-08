/**
 * WriteLink: the top bar's "Write" button (story S1-E3-01; every signed-in board draws it:
 * the main button with a pen, a gold ring when it is the current page).
 *
 * Who shows it: AppLayout, in the top bar's end slot, before the account button, only while
 * someone is signed in. Where it goes: /write (Your writing).
 * Icon: the plain line pen of the header icons (bundle G4 SHELL; canvas Discover.web board), drawn
 * in the button's own text colour, so it suits every theme's accent; the liquid glass design has
 * no doodles (Robert, 7 Nov 2026).
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';
import { useSession } from '@/features/auth/hooks/useSession';

/**
 * Renders the button.
 *
 * @returns the link, or nothing while signed out
 */
export function WriteLink() {
  const { t } = useTranslation('writing');
  const { userId } = useSession();
  if (userId === null) return null;
  return (
    <NavLink
      to="/write"
      className={({ isActive }) =>
        `inline-flex h-11 items-center gap-2 rounded-full button-main px-5 text-sm font-semibold whitespace-nowrap no-underline ${isActive ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface' : ''}`
      }
    >
      <NavIcon name="write" size={16} strokeWidth={2} />
      {t('nav.write')}
    </NavLink>
  );
}
