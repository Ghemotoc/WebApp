/**
 * StoryChapterList: the chapters on the story page (story S1-E3-03; since bundle CALM-7c, board
 * New-Story and the handover's Step 3, "Chapters").
 *
 * The heading counts the chapters ("15 chapters"), with a meta line under it: the words and when
 * the last chapter came out (board B01), "4 of 6 in
 * English" while a later language edition is behind (TRANSLATE-1b), and when the next chapter
 * comes, "Next chapter Thursday" or "Last chapter Thursday" (CALM-6). No card around it.
 * Then one row per chapter, split by the hairline, in one column (user story 2.1, board B01): the
 * title with its number ("1. Fifteen") and a meta line with the state first in bold and the date. Readers see only published
 * chapters, whose titles link to the reader (S1-E4-01a); the owner's preview also lists drafts
 * and scheduled chapters, as plain text with "Draft" or "Scheduled" in words, not pills. A chapter
 * out this week says "New". A chapter not translated yet says "<language> only for now" and
 * opens the "not translated yet" notice.
 * "You are here" (IDEAS-1 part a, IDEA-20261031-4): a signed-in reader's latest place is marked
 * in their chapter's row, in bold words ("You are here, 42%"), as a link that opens the chapter
 * at that place (the address ends "#resume"). It stands in for the board's "Reading", because it
 * also says how far in.
 * Long stories fold (CALM-9, Robert's canvas comments of 23 Nov 2026, board B01): from 600 px a
 * story with more than 11 chapters lists chapters 1 to 10 and the latest, then "Show all N
 * chapters" opens the rest. Phones list the first 4 and the last 3, then "Show chapters 5 to 12"
 * (user story 2.1). The reader's own chapter ("You are here") always stays in sight.
 * Who uses it: StoryPage. What it calls: useStoryLibraryState → story_library_state(), the same
 * place "Continue chapter n" uses.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import type { StoryPlace } from '@/features/library/api/library';
import { useStoryLibraryState } from '@/features/library/hooks/useStoryLibraryState';
import { languageNameIn, languageOwnName } from '@/lib/language-names';
import { formatLocalShortDate } from '@/lib/local-time';

import type { EditionFacts } from '../api/editions';
import type { NextChapter } from '../api/chapter';
import type { StoryPageChapter } from '../api/storyPage';
import { foldedChapterCodes, phoneFoldedChapters, type PhoneFold } from '../lib/chapterFolding';
import { nextChapterText } from '../lib/chapterPlace';
import { isNewChapter } from '../lib/storyPageNumbers';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** The facts under the heading: the words out so far and when the last chapter came. */
export interface ChapterListSummary {
  /** The words in the published chapters, or null when a chapter has no count yet. */
  words: number | null;
  /** When the latest chapter went out, or null before any did. */
  lastOutAt: string | null;
}

/** What a later language edition tells the list (TRANSLATE-1b); null for any other story. */
export interface ChapterListEdition {
  /** The language of the edition on screen. */
  languageCode: string;
  facts: EditionFacts;
}

/** The "You are here" link in the row of the chapter the reader stopped in, in bold words. */
function YouAreHere(props: { place: StoryPlace; storySlug: string; chapterNumber: number }) {
  const { t } = useTranslation('reading');
  const { place, storySlug, chapterNumber } = props;
  return (
    <Link
      to={`/s/${storySlug}/${place.chapterCode}#resume`}
      aria-label={t('storyPage.youAreHereLink', { percent: place.percent, number: chapterNumber })}
      className="inline-flex min-h-6 items-center font-semibold text-ink underline-offset-2 hover:underline"
    >
      {t('storyPage.youAreHere', { percent: place.percent })}
    </Link>
  );
}

/**
 * The words after the title: the state first in bold (Draft, Scheduled for the owner; New for a
 * chapter out this week), "<language> only for now" for a chapter not translated yet
 * (TRANSLATE-1b), then the dates.
 *
 * @returns the facts
 */
function useChapterFacts(chapter: StoryPageChapter, originalLanguage: string | null): MetaFact[] {
  const { t, i18n } = useTranslation('reading');
  const { t: editionsText } = useEditionsTranslation();
  const facts: MetaFact[] = [];
  // Step 1: the state, in words, never a pill (handover Step 3).
  if (chapter.status === 'draft') facts.push({ text: t('storyPage.draftChapter'), kind: 'state' });
  if (chapter.status === 'scheduled') {
    facts.push({ text: t('storyPage.scheduledChapter'), kind: 'state' });
  }
  if (isNewChapter(chapter, new Date())) {
    facts.push({ text: t('storyPage.newChapter'), kind: 'state' });
  }
  if (!chapter.isTranslated && originalLanguage !== null) {
    facts.push({
      text: editionsText('onlyForNow', { language: languageOwnName(originalLanguage) }),
    });
  }
  // Step 2: the dates, on the reader's own calendar (CALM-8b).
  if (chapter.publishedAt !== null) {
    facts.push({ text: formatLocalShortDate(new Date(chapter.publishedAt), i18n.language) });
  }
  if (chapter.editedAt !== null) {
    const date = formatLocalShortDate(new Date(chapter.editedAt), i18n.language);
    facts.push({ text: t('storyPage.editedOn', { date }) });
  }
  return facts;
}

/**
 * The title with its number ("1. Fifteen", board B01): a link to the reader when the chapter is
 * published, plain text otherwise.
 */
function ChapterTitle({ chapter, storySlug }: { chapter: StoryPageChapter; storySlug: string }) {
  const { t } = useTranslation('reading');
  const name = chapter.title === '' ? t('storyPage.untitledChapter') : chapter.title;
  const title = t('storyPage.numberedChapter', { number: chapter.number, title: name });
  const className = 'type-body leading-5 font-semibold break-words text-ink-heading';
  if (chapter.status !== 'published') {
    return (
      <span data-chapter-title className={className}>
        {title}
      </span>
    );
  }
  return (
    <Link
      data-chapter-title
      to={`/s/${storySlug}/${chapter.code}`}
      className={`${className} no-underline hover:underline`}
    >
      {title}
    </Link>
  );
}

/** How a row is folded: away from 600 px (desktop fold), away on phones, or not at all. */
interface RowFold {
  onWide: boolean;
  onPhone: boolean;
}

/** The classes that hide a folded row: on phones below 600 px, or from 600 px up. */
function foldClasses(fold: RowFold): string {
  const classes: string[] = [];
  if (fold.onPhone) classes.push('max-[599px]:hidden');
  if (fold.onWide) classes.push('min-[600px]:hidden');
  return classes.join(' ');
}

/** One row (board B01): the numbered title, then the state and the date. */
function ChapterRow(props: {
  chapter: StoryPageChapter;
  storySlug: string;
  place: StoryPlace | null;
  /** The language the story was written in, named on a chapter that isn't translated yet. */
  originalLanguage: string | null;
  fold: RowFold;
}) {
  const { chapter, storySlug, place, originalLanguage, fold } = props;
  const facts = useChapterFacts(chapter, originalLanguage);
  const isHere =
    place !== null && place.chapterCode === chapter.code && chapter.status === 'published';
  return (
    <li className={`flex flex-col gap-1 border-t border-(--hairline) py-3 ${foldClasses(fold)}`}>
      <ChapterTitle chapter={chapter} storySlug={storySlug} />
      <div className="flex flex-wrap items-center gap-x-2 type-meta">
        {isHere && (
          <YouAreHere place={place} storySlug={storySlug} chapterNumber={chapter.number} />
        )}
        <MetaLine facts={facts} />
      </div>
    </li>
  );
}

/** The classes every fold button shares: an underlined text button, 44 px tall. */
const foldButtonClass =
  'min-h-11 items-center self-start type-body font-semibold text-ink underline underline-offset-2';

/**
 * The fold buttons under a folded list: "Show all N chapters" from 600 px and "Show chapters 5 to
 * 12" on phones; each becomes "Show fewer chapters" once the list is open.
 *
 * @returns the buttons that apply
 */
function FoldButtons(props: {
  total: number;
  hasWideFold: boolean;
  phoneFold: PhoneFold;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('reading');
  const { total, hasWideFold, phoneFold, isOpen, onToggle } = props;
  const fewer = t('storyPage.showFewerChapters');
  return (
    <>
      {hasWideFold && (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="story-chapter-rows"
          onClick={onToggle}
          className={`hidden min-[600px]:inline-flex ${foldButtonClass}`}
        >
          {isOpen ? fewer : t('storyPage.showAllChapters', { count: total })}
        </button>
      )}
      {phoneFold.range !== null && (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="story-chapter-rows"
          onClick={onToggle}
          className={`inline-flex min-[600px]:hidden ${foldButtonClass}`}
        >
          {isOpen ? fewer : t('storyPage.showChapterRange', phoneFold.range)}
        </button>
      )}
    </>
  );
}

/**
 * The meta line beside the heading: "4 of 6 in English" while this language edition is behind
 * (TRANSLATE-1b), and when the next chapter comes (CALM-6).
 *
 * @returns the facts
 */
function useHeadingFacts(
  edition: ChapterListEdition | null,
  nextChapter: NextChapter | null,
  summary: ChapterListSummary | null,
) {
  const { t, i18n } = useTranslation('reading');
  const { t: editionsText } = useEditionsTranslation();
  const facts: MetaFact[] = [];
  // Step 1: the words out so far and when the last chapter came (board B01: "31.4k words · last
  // chapter out today").
  if (summary !== null && summary.words !== null && summary.words > 0) {
    const value = new Intl.NumberFormat(i18n.language, { notation: 'compact' }).format(
      summary.words,
    );
    facts.push({ text: t('storyPage.words', { count: summary.words, value }) });
  }
  if (summary !== null && summary.lastOutAt !== null) {
    const date = formatLocalShortDate(new Date(summary.lastOutAt), i18n.language);
    facts.push({ text: t('storyPage.lastChapterOut', { date }) });
  }
  // Step 2: how far a later language edition is, and when the next chapter comes.
  if (edition !== null && edition.facts.chaptersHere < edition.facts.chaptersInStory) {
    facts.push({
      text: editionsText('chaptersIn', {
        count: edition.facts.chaptersHere,
        total: edition.facts.chaptersInStory,
        language: languageNameIn(edition.languageCode, i18n.language),
      }),
    });
  }
  const nextLine = nextChapterText(t, nextChapter, i18n.language, new Date());
  if (nextLine !== null) facts.push({ text: nextLine });
  return facts;
}

/**
 * Renders the list.
 *
 * @returns the card, or a short line for an owner with no chapters
 */
export function StoryChapterList({
  chapters,
  isOwner,
  storySlug,
  edition = null,
  nextChapter = null,
  summary = null,
}: {
  chapters: StoryPageChapter[];
  isOwner: boolean;
  /** The story's address, for each chapter's link to the reader. */
  storySlug: string;
  /** For a story in several languages: the edition on screen (TRANSLATE-1b). */
  edition?: ChapterListEdition | null;
  /** CALM-6: the next scheduled chapter, or null. */
  nextChapter?: NextChapter | null;
  /** The words out so far and when the last chapter came (board B01). */
  summary?: ChapterListSummary | null;
}) {
  const { t } = useTranslation('reading');
  // The reader's latest place in the story; null signed out or before they read.
  const { state } = useStoryLibraryState(storySlug);
  const place = state?.place ?? null;
  const headingFacts = useHeadingFacts(edition, nextChapter, summary);
  // CALM-9: long lists fold from 600 px until the reader opens them.
  const [isOpen, setIsOpen] = useState(false);
  const placeCode = place?.chapterCode ?? null;
  const folded = foldedChapterCodes(chapters, placeCode);
  const phoneFold = phoneFoldedChapters(chapters, placeCode);
  return (
    <section aria-labelledby="story-chapters-heading" className="flex flex-col gap-3">
      {/* The heading counts the chapters listed ("15 chapters"), with the facts under it. */}
      <h2 id="story-chapters-heading" className="m-0 type-heading text-ink-heading">
        {t('storyPage.chapterCount', { count: chapters.length })}
      </h2>
      <MetaLine facts={headingFacts} />
      {chapters.length === 0 && isOwner && (
        <p className="m-0 type-body text-ink-muted">{t('storyPage.noChaptersOwner')}</p>
      )}
      {/* One column, as on board B01. */}
      <ol id="story-chapter-rows" className="m-0 list-none p-0">
        {chapters.map((chapter) => (
          <ChapterRow
            key={chapter.code}
            chapter={chapter}
            storySlug={storySlug}
            place={place}
            originalLanguage={edition?.facts.originalLanguage ?? null}
            fold={{
              onWide: !isOpen && folded.has(chapter.code),
              onPhone: !isOpen && phoneFold.codes.has(chapter.code),
            }}
          />
        ))}
      </ol>
      <FoldButtons
        total={chapters.length}
        hasWideFold={folded.size > 0}
        phoneFold={phoneFold}
        isOpen={isOpen}
        onToggle={() => setIsOpen((wasOpen) => !wasOpen)}
      />
    </section>
  );
}
