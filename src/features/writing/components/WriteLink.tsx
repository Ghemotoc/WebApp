/**
 * WriteLink: the top bar's "Write" button (story S1-E3-01). Since the simplified design (bundle
 * CALM-2; TopBar/README.md) it is a quiet button, the tint with no edge, with the pen and the word:
 * never plum, because the one plum button on a screen belongs to the page. On /write React
 * Router marks it with aria-current, so a screen reader hears it is the current page, and it
 * gains a 2 px thread-colour ring, so sighted people see it too: none of the four track links is
 * current there, and without the ring nothing on the bar would show where they are (CALM-2
 * quality check; the old gold ring did this job before).
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
      className="button-glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] leading-5 font-semibold whitespace-nowrap no-underline aria-[current=page]:ring-2 aria-[current=page]:ring-thread"
    >
      <NavIcon name="write" size={16} strokeWidth={2} />
      {t('nav.write')}
    </NavLink>
  );
}
