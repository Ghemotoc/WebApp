/**
 * ReadInSwitch: "Read in: English", the control that changes a story's language (bundle
 * TRANSLATE-1b; boards TrStory and TrReader; Robert, 16 Nov 2026).
 *
 * What it shows: a glass pill with a globe, "Read in: <language>" and a chevron. It opens a
 * short list, one link per language the story can be read in, on one line as board B07 draws it:
 * a tick on the one being read, the language's own name, then "· Translated by <name>" (a
 * classic) or "· Original". In the reader each link leads to the same chapter in that language
 * and carries the paragraph the reader was on (lib/languageSwitchPlace.ts); the new page says
 * "You stay on chapter n. Your choice is remembered for this story." (LanguageSwitchNote,
 * BOOKS B07, user story 2.7).
 * Robert's rule (16 Nov 2026, 12:23 UTC): it shows only when a story has more than one language.
 * For a story in one language the database sends no editions and this draws nothing.
 * The choice is remembered for the story in this browser (lib/rememberedEdition.ts) and, for a
 * signed-in reader, in the account, so every device opens the same language (design books item 17).
 * Accessibility: the pill is a button with aria-expanded; the list is a navigation of real links
 * (each opens a page), the current one marked with aria-current; Escape closes it and puts the
 * focus back on the pill; 44 px rows.
 * Who uses it: StoryHeader directly; ChapterBar and TeaserPage through LazyReadInSwitch.
 */
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { languageOwnName } from '@/lib/language-names';
import { useRememberedPlace } from '@/lib/remembered/useRememberedPlace';

import type { StoryEdition } from '../api/editions';
import { firstBlockInView, type LanguageSwitchState } from '../lib/languageSwitchPlace';
import { saveRememberedEdition } from '../lib/rememberedEdition';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** The list's width in pixels (the w-[280px] class below). */
const LIST_WIDTH = 280;

/** What the switch needs. */
export interface ReadInSwitchProps {
  /** The story's editions, the first edition first; fewer than two draws nothing. */
  editions: StoryEdition[];
  /** In the reader: the chapter's number (the link then keeps the paragraph); null on the story page. */
  chapterNumber: number | null;
}

/** Where one edition's link leads: its story page, or the same chapter in that language. */
function editionAddress(edition: StoryEdition): string {
  const storyAddress = `/s/${edition.slug}`;
  return edition.chapterCode === null ? storyAddress : `${storyAddress}/${edition.chapterCode}`;
}

/** What follows the language's name: "· Original", "· Translated by …", or nothing. */
function EditionNote({ edition }: { edition: StoryEdition }) {
  const { t } = useEditionsTranslation();
  if (edition.isOriginal) return <span> · {t('original')}</span>;
  if (edition.translatorName === null) return null;
  return <span> · {t('translatedBy', { name: edition.translatorName })}</span>;
}

/**
 * One row of the list (board B07): a tick on the one on screen, then the language and its note on
 * one line, wrapping only when a translator's name is long.
 */
function EditionLink(props: {
  edition: StoryEdition;
  onPick: (edition: StoryEdition, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { edition, onPick } = props;
  return (
    <li>
      <Link
        to={editionAddress(edition)}
        aria-current={edition.isCurrent ? 'true' : undefined}
        onClick={(event) => onPick(edition, event)}
        className="flex min-h-11 items-center gap-2 rounded-field px-3 py-2 type-body font-semibold break-words text-ink-heading no-underline hover:bg-tint"
      >
        {edition.isCurrent && <ActionIcon name="check" size={16} className="flex-none" />}
        <span className="min-w-0">
          <span lang={edition.languageCode}>{languageOwnName(edition.languageCode)}</span>
          <EditionNote edition={edition} />
        </span>
      </Link>
    </li>
  );
}

/**
 * Closes the list on Escape (focus back on the pill) and on a press anywhere outside it.
 *
 * @param isOpen - whether the list is open
 * @param close - closes it; `true` also returns the focus to the pill
 * @returns the ref to put on the element that wraps the pill and the list
 */
function useCloseFromOutside(isOpen: boolean, close: (refocus: boolean) => void) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    /** Escape closes the list and returns to the pill. */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(true);
    }
    /** A press outside the switch closes the list. */
    function onPointerDown(event: PointerEvent) {
      const wrapper = wrapperRef.current;
      if (wrapper !== null && event.target instanceof Node && !wrapper.contains(event.target)) {
        close(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, close]);
  return wrapperRef;
}

/**
 * Keeps the language a reader picks for a story: in this browser (lib/rememberedEdition.ts) and,
 * signed in, in the account so every device opens it (design books item 17).
 *
 * @param editions - the story's editions; the first one's address names the story
 * @returns remember(languageCode)
 */
function useRememberLanguage(editions: StoryEdition[]): (languageCode: string) => void {
  const firstEditionSlug = editions[0]?.slug ?? null;
  const { remember } = useRememberedPlace('story_edition', firstEditionSlug);
  return (languageCode: string) => {
    if (firstEditionSlug === null) return;
    saveRememberedEdition(firstEditionSlug, languageCode);
    remember({ languageCode });
  };
}

/**
 * Renders the switch.
 *
 * @returns the pill and its list, or nothing for a story in one language
 */
export function ReadInSwitch({ editions, chapterNumber }: ReadInSwitchProps) {
  const { t } = useEditionsTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Which edge of the pill the list hangs from, so it never leaves the screen (rule 21).
  const [hangsFromLeft, setHangsFromLeft] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = `read-in-${useId()}`;
  const wrapperRef = useCloseFromOutside(isOpen, (refocus) => {
    setIsOpen(false);
    if (refocus) buttonRef.current?.focus();
  });

  const rememberLanguage = useRememberLanguage(editions);
  const navigate = useNavigate();

  // Robert, 16 Nov 2026: no switch for a story in one language.
  if (editions.length < 2) return null;
  const current = editions.find((edition) => edition.isCurrent) ?? editions[0];
  if (current === undefined) return null;

  /**
   * Remembers the language picked for this story, then opens it. In the reader the paragraph on
   * screen travels with it in the navigation's state (BOOKS B07); on the story page the link
   * simply opens.
   */
  function pick(edition: StoryEdition, event: MouseEvent<HTMLAnchorElement>) {
    rememberLanguage(edition.languageCode);
    setIsOpen(false);
    // A new tab or window (Ctrl, Cmd, Shift or the middle button) opens the link as it is.
    const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
    if (chapterNumber === null || opensElsewhere) return;
    event.preventDefault();
    const state: LanguageSwitchState = { languageSwitch: { block: firstBlockInView() } };
    void navigate(editionAddress(edition), { state });
  }

  /** Opens or closes the list; on opening, picks the side that keeps it on screen. */
  function toggle() {
    const pill = buttonRef.current;
    // A list hung from the pill's right edge needs its width (280 px + a 16 px gutter) to the left.
    if (pill !== null) setHangsFromLeft(pill.getBoundingClientRect().right < LIST_WIDTH + 16);
    setIsOpen((open) => !open);
  }

  return (
    <div ref={wrapperRef} className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={toggle}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full button-glass px-4 type-body font-semibold whitespace-nowrap text-ink-heading"
      >
        <ActionIcon name="globe" size={15} className="flex-none" />
        <span>{t('readIn', { language: languageOwnName(current.languageCode) })}</span>
        <ChevronDownIcon />
      </button>
      {/* Painted fully solid (not the 92% glass of other pop-overs): it opens inside the reader's
          glass bar, where a blur can't reach the page behind, so text under it would show through. */}
      <nav
        id={listId}
        aria-label={t('readInList')}
        hidden={!isOpen}
        className={`absolute top-full z-20 mt-2 flex w-[280px] max-w-[calc(100vw-32px)] flex-col gap-1 rounded-card border border-border bg-[var(--surface)] p-2 shadow-popover ${hangsFromLeft ? 'left-0' : 'right-0'}`}
      >
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {editions.map((edition) => (
            <EditionLink key={edition.slug} edition={edition} onPick={pick} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
