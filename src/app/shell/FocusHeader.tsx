/**
 * FocusHeader: header A, the narrow-screen header where a person types, edits or reads
 * (bundle G4 SHELL; handoff "App header and tab bar": "Header A (places you type or edit, such as
 * the editor, publish, chapter plan, character, add relationship, avatar, chat, thread, sign up,
 * log in and age check): back button plus title, no tab bar").
 *
 * A round 44 px glass Back button and a glass pill with the place's short title ("Edit chapter").
 * The title is not a heading: the page keeps its own h1, so the outline has one top heading.
 * Back returns to the page the person came from when it is one of ours; when they arrived straight
 * from a link (a shared chapter, an email), it goes to the place's parent page instead
 * (shellScreens.ts), so Back never leaves the website.
 * Who uses it: AppLayout, below 1024 px, for the addresses listed in shellScreens.ts.
 * What it calls: React Router's navigate, NavIcon.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

/** What header A needs. */
export interface FocusHeaderProps {
  /** A key under shell.focus in common.json, such as "editChapter". */
  titleKey: string;
  /** Where Back goes when there is no page of ours to go back to. */
  backTo: string;
}

/**
 * Says whether the browser's previous page is one of ours. React Router counts the pages it has
 * shown in history.state.idx; 0 means this page was the first one opened in the tab.
 *
 * @returns true when going back stays on the website
 */
function hasPageToGoBackTo(): boolean {
  const historyState: unknown = window.history.state;
  if (typeof historyState !== 'object' || historyState === null) return false;
  const index = (historyState as { idx?: unknown }).idx;
  return typeof index === 'number' && index > 0;
}

/**
 * Renders header A.
 *
 * @returns the header with Back and the title
 */
export function FocusHeader({ titleKey, backTo }: FocusHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /** Step back one page when it is ours; otherwise open the parent page. */
  function goBack() {
    if (hasPageToGoBackTo()) {
      void navigate(-1);
      return;
    }
    void navigate(backTo);
  }

  return (
    // NAV-1 (Robert, 10 Nov 2026): Back and the title float over the page however far it
    // scrolls; the header's own box lets clicks through to the page beside them.
    <header className="pointer-events-none sticky top-0 z-30 flex items-center gap-2 px-3.5 pt-4">
      <button
        type="button"
        onClick={goBack}
        aria-label={t('shell.back')}
        className="glass-float pointer-events-auto inline-flex size-12 shrink-0 items-center justify-center rounded-full text-ink"
      >
        <NavIcon name="back" size={22} />
      </button>
      {/* The title wraps rather than being cut off on the narrowest phones (CLAUDE.md rule 21). */}
      <p className="glass-float pointer-events-auto m-0 inline-flex min-h-12 min-w-0 items-center rounded-[24px] px-5 py-2 font-heading text-[17px] leading-tight font-bold text-heading">
        {t(`shell.focus.${titleKey}`)}
      </p>
    </header>
  );
}
