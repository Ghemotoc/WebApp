/**
 * WriteLink: the top bar's "Write" button (story S1-E3-01; every signed-in board draws it:
 * a dark pill with the pen doodle icon, a gold ring when it is the current page).
 *
 * Who shows it: AppLayout, in the top bar's end slot, before the account button, only while
 * someone is signed in. Where it goes: /write (Your writing).
 * Icon: the pen from the doodle set (design/assets, 43adcaa6…), as the boards use. The file's
 * ink is dark, so on the dark pill it is inverted with a CSS filter until Lane B's tokenised
 * doodle icons land (docs/board-fixes.md).
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import penIcon from '@/assets/icons/pen.svg';
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
      <img
        src={penIcon}
        alt=""
        aria-hidden="true"
        width={18}
        height={18}
        className="tmc-icon-on-dark"
      />
      {t('nav.write')}
    </NavLink>
  );
}
