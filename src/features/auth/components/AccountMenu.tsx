/**
 * AccountMenu: the signed-in person's button in the top bar (story S1-E2-05;
 * design/boards/Main.dc.html shows a round avatar button there).
 *
 * The panel starts with the person's name and @username, a link to their own public profile, then
 * "Edit profile" (Settings › Profile), Settings, Resources (G9a) and Log out (bundle NAV-1; Robert, 6 Nov 2026,
 * 18:40 UTC: "when you press on the name, it should go to the public profile. But then, in the
 * dropdown, you also have the option to go to the settings profile"). Before a username is chosen
 * there is no public profile yet, so the name row and "Edit profile" are left out.
 *
 * How it works: a disclosure, not an ARIA menu: the button says whether the panel is open
 * (aria-expanded) and the panel holds an ordinary link and button, so Tab and Enter work as
 * everywhere else. Escape closes it and puts focus back on the button; clicking elsewhere closes
 * it too. The button is the person's own avatar: their drawn avatar, or their initials on the glass
 * bead in their colour (bundle G4 SHELL; PersonAvatar); its accessible name is "Account" with
 * the initials on the bead ("Account, AW"; WCAG 2.5.3, label in name).
 * Who shows it: AccountLinks, once someone is signed in, with the shown name and username.
 * What it calls: api/signIn.ts → signOutHere(); after logging out it goes to the home page.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { initialsOf } from '@/features/people/lib/formatting';
import { getSupabaseClient } from '@/lib/supabase';

import { signOutHere } from '../api/signIn';

/** The panel's rows: links and buttons look the same. */
const rowClasses =
  'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-heading no-underline hover:bg-tint';

/**
 * Closes the open panel on a click outside it, or on Escape (which puts focus back on the button).
 *
 * @param isOpen - whether the panel is open
 * @param close - closes it
 * @param buttonRef - the account button, to take focus back after Escape
 * @returns the ref to put on the menu's wrapper
 */
function useClosePanel(
  isOpen: boolean,
  close: () => void,
  buttonRef: RefObject<HTMLButtonElement | null>,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      close();
      buttonRef.current?.focus();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, buttonRef]);
  return wrapperRef;
}

/**
 * The panel's first row: the person's name and @username, linking to their public profile
 * (/u/<username>), the page other people see.
 *
 * @param props.name - the shown name (pen name, or the username when there is none)
 * @param props.handle - the username, without the @
 * @param props.onOpen - closes the panel once the link is followed
 * @returns the profile row
 */
function ProfileRow({
  name,
  handle,
  onOpen,
}: {
  name: string;
  handle: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/u/${encodeURIComponent(handle)}`}
      className="mb-1 flex min-h-11 flex-col justify-center rounded-xl border-b border-border px-3 py-2 text-left no-underline hover:bg-tint"
      onClick={onOpen}
    >
      <span className="truncate text-sm font-bold text-heading">{name}</span>
      <span className="truncate text-xs text-body">@{handle}</span>
      <span className="text-xs font-semibold text-link underline">{t('nav.viewProfile')}</span>
    </Link>
  );
}

/** What AccountMenu needs to know about the signed-in person. */
interface AccountMenuProps {
  /** The first letter of the person's name, or "?" before setup. */
  initial: string;
  /** The shown name, or null before a username is chosen. */
  name: string | null;
  /** The username without the @, or null before one is chosen. */
  handle: string | null;
}

/**
 * Logs this device out and goes home, remembering a failure so the panel can say so.
 *
 * @param onDone - closes the panel once logged out
 * @returns the log-out action and whether it failed
 */
function useLogOut(onDone: () => void) {
  const navigate = useNavigate();
  const [logOutFailed, setLogOutFailed] = useState(false);

  /** Logs this device out, then goes home. */
  async function logOut() {
    try {
      const client = await getSupabaseClient();
      if (client !== null) await signOutHere(client);
      onDone();
      void navigate('/');
    } catch {
      setLogOutFailed(true);
    }
  }

  return { logOut, logOutFailed };
}

/**
 * Renders the button and, when open, the panel.
 *
 * @param props - see AccountMenuProps
 * @returns the account menu
 */
export function AccountMenu({ initial, name, handle }: AccountMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useClosePanel(isOpen, closePanel, buttonRef);
  const { logOut, logOutFailed } = useLogOut(closePanel);

  /** Closes the panel. */
  function closePanel() {
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="account-menu-panel"
        aria-label={t('nav.accountWithInitials', { initials: initialsOf(name ?? initial) })}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex size-11 items-center justify-center rounded-full"
      >
        {/* The same bead (or drawn avatar) as beside the person's name everywhere else. The
            initials on it are part of the button's name ("Account, AW"), because WCAG 2.5.3
            (label in name) asks that text a person can see is also in what they can say to
            voice control. */}
        <PersonAvatar name={name ?? initial} handle={handle} size="large" />
      </button>
      <div
        id="account-menu-panel"
        hidden={!isOpen}
        className="absolute top-full right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-popover"
      >
        {/* Step 1: the public profile, then where to edit it (NAV-1); drawn only while open, so
            a closed menu adds no second @username to a page such as Settings. */}
        {isOpen && handle !== null && (
          <>
            <ProfileRow name={name ?? handle} handle={handle} onOpen={closePanel} />
            <Link to="/settings#profile" className={rowClasses} onClick={closePanel}>
              {t('nav.editProfile')}
            </Link>
          </>
        )}
        {/* Step 2: every setting, Resources (writers' rights and the how-to guides, G9a; Robert,
            9 Nov 2026: "a separate Resources page from the avatar menu"), and logging out. */}
        <Link to="/settings" className={rowClasses} onClick={() => setIsOpen(false)}>
          {t('nav.settings')}
        </Link>
        <Link to="/resources" className={rowClasses} onClick={() => setIsOpen(false)}>
          {t('nav.resources')}
        </Link>
        <button type="button" className={rowClasses} onClick={() => void logOut()}>
          {t('nav.logOut')}
        </button>
        {logOutFailed && <Notice tone="error">{t('nav.logOutFailed')}</Notice>}
      </div>
    </div>
  );
}
