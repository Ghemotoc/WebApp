/**
 * AccountMenu: the signed-in person's button in the top bar, with Settings and Log out
 * (story S1-E2-05; design/boards/Main.dc.html shows a round avatar button there).
 *
 * How it works: a disclosure, not an ARIA menu: the button says whether the panel is open
 * (aria-expanded) and the panel holds an ordinary link and button, so Tab and Enter work as
 * everywhere else. Escape closes it and puts focus back on the button; clicking elsewhere closes
 * it too. The button shows the person's initial; its accessible name is "Your account".
 * Who shows it: AccountLinks, once someone is signed in.
 * What it calls: api/signIn.ts → signOutHere(); after logging out it goes to the home page.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { Notice } from '@/components/ui/Notice';
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
 * Renders the button and, when open, the panel.
 *
 * @param props.initial - the first letter of the person's name, or "?" before setup
 * @returns the account menu
 */
export function AccountMenu({ initial }: { initial: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logOutFailed, setLogOutFailed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useClosePanel(isOpen, closePanel, buttonRef);

  /** Closes the panel. */
  function closePanel() {
    setIsOpen(false);
  }

  /** Logs this device out, then goes home. */
  async function logOut() {
    try {
      const client = await getSupabaseClient();
      if (client !== null) await signOutHere(client);
      setIsOpen(false);
      void navigate('/');
    } catch {
      setLogOutFailed(true);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="account-menu-panel"
        aria-label={t('nav.account')}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex size-11 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-on-primary uppercase"
      >
        {initial}
      </button>
      <div
        id="account-menu-panel"
        hidden={!isOpen}
        className="absolute top-full right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-card"
      >
        <Link to="/settings" className={rowClasses} onClick={() => setIsOpen(false)}>
          {t('nav.settings')}
        </Link>
        <button type="button" className={rowClasses} onClick={() => void logOut()}>
          {t('nav.logOut')}
        </button>
        {logOutFailed && <Notice tone="error">{t('nav.logOutFailed')}</Notice>}
      </div>
    </div>
  );
}
