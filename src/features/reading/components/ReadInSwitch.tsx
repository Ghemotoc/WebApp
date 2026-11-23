/**
 * ReadInSwitch: "Read in: English", the control that changes a story's language (bundle
 * TRANSLATE-1b; boards TrStory and TrReader; Robert, 16 Nov 2026).
 *
 * What it shows: a glass pill with a globe, "Read in: <language>" and a chevron. It opens a
 * short list, one link per language the story can be read in: the language's own name, under it
 * "Translated by <name>" (a classic) or "Original", and a tick on the one being read. In the
 * reader the list ends with "You stay on chapter n.", because each link leads to the same chapter
 * in that language.
 * Robert's rule (16 Nov 2026, 12:23 UTC): it shows only when a story has more than one language.
 * For a story in one language the database sends no editions and this draws nothing.
 * The choice is remembered for the story in this browser (lib/rememberedEdition.ts).
 * Accessibility: the pill is a button with aria-expanded; the list is a navigation of real links
 * (each opens a page), the current one marked with aria-current; Escape closes it and puts the
 * focus back on the pill; 44 px rows.
 * Who uses it: StoryHeader directly; ChapterBar and TeaserPage through LazyReadInSwitch.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { languageOwnName } from '@/lib/language-names';

import type { StoryEdition } from '../api/editions';
import { saveRememberedEdition } from '../lib/rememberedEdition';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** The list's width in pixels (the w-[280px] class below). */
const LIST_WIDTH = 280;

/** What the switch needs. */
export interface ReadInSwitchProps {
  /** The story's editions, the first edition first; fewer than two draws nothing. */
  editions: StoryEdition[];
  /** In the reader: the chapter's number, for "You stay on chapter n."; null on the story page. */
  chapterNumber: number | null;
}

/** Where one edition's link leads: its story page, or the same chapter in that language. */
function editionAddress(edition: StoryEdition): string {
  const storyAddress = `/s/${edition.slug}`;
  return edition.chapterCode === null ? storyAddress : `${storyAddress}/${edition.chapterCode}`;
}

/** The small line under a language: who translated it, or that it is the original. */
function EditionNote({ edition }: { edition: StoryEdition }) {
  const { t } = useEditionsTranslation();
  if (edition.isOriginal) {
    return <span className="type-meta text-ink-muted">{t('original')}</span>;
  }
  if (edition.translatorName === null) return null;
  return (
    <span className="type-meta break-words text-ink-muted">
      {t('translatedBy', { name: edition.translatorName })}
    </span>
  );
}

/** One row of the list: a link to that language, ticked when it is the one on screen. */
function EditionLink(props: { edition: StoryEdition; onPick: (edition: StoryEdition) => void }) {
  const { edition, onPick } = props;
  return (
    <li>
      <Link
        to={editionAddress(edition)}
        aria-current={edition.isCurrent ? 'true' : undefined}
        onClick={() => onPick(edition)}
        className={`flex min-h-[52px] items-center justify-between gap-3 rounded-field px-4 py-2 text-ink-heading no-underline hover:bg-tint ${edition.isCurrent ? 'bg-tint' : ''}`}
      >
        <span className="flex min-w-0 flex-col">
          <span lang={edition.languageCode} className="type-body font-semibold">
            {languageOwnName(edition.languageCode)}
          </span>
          <EditionNote edition={edition} />
        </span>
        {edition.isCurrent && <ActionIcon name="check" size={16} className="flex-none" />}
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

  // Robert, 16 Nov 2026: no switch for a story in one language.
  if (editions.length < 2) return null;
  const current = editions.find((edition) => edition.isCurrent) ?? editions[0];
  // The first edition's address names the story for the remembered choice.
  const firstEditionSlug = editions[0]?.slug ?? '';
  if (current === undefined) return null;

  /** Remembers the language picked for this story, then lets the link open it. */
  function pick(edition: StoryEdition) {
    saveRememberedEdition(firstEditionSlug, edition.languageCode);
    setIsOpen(false);
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
        {chapterNumber !== null && (
          <p className="m-0 px-4 pt-2 pb-1 type-meta text-ink-muted">
            {t('staysOnChapter', { number: chapterNumber })}
          </p>
        )}
      </nav>
    </div>
  );
}
