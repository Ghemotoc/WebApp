/**
 * StoryChapterList: the chapters on the story page (story S1-E3-03; since bundle CALM-7c, board
 * New-Story and the handover's Step 3, "Chapters").
 *
 * The heading counts the chapters ("15 chapters"), with a meta line beside it: "4 of 6 in
 * English" while a later language edition is behind (TRANSLATE-1b), and when the next chapter
 * comes, "Next chapter Thursday" or "Last chapter Thursday" (CALM-6). No card around it.
 * Then one row per chapter, split by the hairline, in two columns from 900 px: the number, the
 * title, and a meta line with the state first in bold and the date. Readers see only published
 * chapters, whose titles link to the reader (S1-E4-01a); the owner's preview also lists drafts
 * and scheduled chapters, as plain text with "Draft" or "Scheduled" in words, not pills. A chapter
 * out this week says "New". A chapter not translated yet says "<language> only for now" and
 * opens the "not translated yet" notice.
 * "You are here" (IDEAS-1 part a, IDEA-20261031-4): a signed-in reader's latest place is marked
 * in their chapter's row, in bold words ("You are here, 42%"), as a link that opens the chapter
 * at that place (the address ends "#resume"). It stands in for the board's "Reading", because it
 * also says how far in.
 * Who uses it: StoryPage. What it calls: useStoryLibraryState → story_library_state(), the same
 * place "Continue chapter n" uses.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import type { StoryPlace } from '@/features/library/api/library';
import { useStoryLibraryState } from '@/features/library/hooks/useStoryLibraryState';
import { languageNameIn, languageOwnName } from '@/lib/language-names';
import { formatLocalDate } from '@/lib/local-time';

import type { EditionFacts } from '../api/editions';
import type { NextChapter } from '../api/chapter';
import type { StoryPageChapter } from '../api/storyPage';
import { nextChapterText } from '../lib/chapterPlace';
import { isNewChapter } from '../lib/storyPageNumbers';
import { useEditionsTranslation } from '../registerEditionsTranslations';

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
      className="inline-flex min-h-6 items-center font-bold text-ink underline-offset-2 hover:underline"
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
    facts.push({ text: formatLocalDate(new Date(chapter.publishedAt), i18n.language) });
  }
  if (chapter.editedAt !== null) {
    const date = formatLocalDate(new Date(chapter.editedAt), i18n.language);
    facts.push({ text: t('storyPage.editedOn', { date }) });
  }
  return facts;
}

/** The title: a link to the reader when the chapter is published, plain text otherwise. */
function ChapterTitle({ chapter, storySlug }: { chapter: StoryPageChapter; storySlug: string }) {
  const { t } = useTranslation('reading');
  const title = chapter.title === '' ? t('storyPage.untitledChapter') : chapter.title;
  const className = 'text-[15px] leading-5 font-semibold break-words text-heading';
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

/** One row (board New-Story): the number, the title, then the state and the date. */
function ChapterRow(props: {
  chapter: StoryPageChapter;
  storySlug: string;
  place: StoryPlace | null;
  /** The language the story was written in, named on a chapter that isn't translated yet. */
  originalLanguage: string | null;
}) {
  const { chapter, storySlug, place, originalLanguage } = props;
  const facts = useChapterFacts(chapter, originalLanguage);
  const isHere =
    place !== null && place.chapterCode === chapter.code && chapter.status === 'published';
  return (
    <li className="grid break-inside-avoid grid-cols-[28px_minmax(0,1fr)] items-baseline gap-x-2.5 border-t border-(--hairline) py-3">
      <span className="text-[13px] text-body tabular-nums">{chapter.number}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <ChapterTitle chapter={chapter} storySlug={storySlug} />
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] leading-[18px]">
          {isHere && (
            <YouAreHere place={place} storySlug={storySlug} chapterNumber={chapter.number} />
          )}
          <MetaLine facts={facts} />
        </div>
      </div>
    </li>
  );
}

/**
 * The meta line beside the heading: "4 of 6 in English" while this language edition is behind
 * (TRANSLATE-1b), and when the next chapter comes (CALM-6).
 *
 * @returns the facts
 */
function useHeadingFacts(edition: ChapterListEdition | null, nextChapter: NextChapter | null) {
  const { t, i18n } = useTranslation('reading');
  const { t: editionsText } = useEditionsTranslation();
  const facts: MetaFact[] = [];
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
}: {
  chapters: StoryPageChapter[];
  isOwner: boolean;
  /** The story's address, for each chapter's link to the reader. */
  storySlug: string;
  /** For a story in several languages: the edition on screen (TRANSLATE-1b). */
  edition?: ChapterListEdition | null;
  /** CALM-6: the next scheduled chapter, or null. */
  nextChapter?: NextChapter | null;
}) {
  const { t } = useTranslation('reading');
  // The reader's latest place in the story; null signed out or before they read.
  const { state } = useStoryLibraryState(storySlug);
  const place = state?.place ?? null;
  const headingFacts = useHeadingFacts(edition, nextChapter);
  return (
    <section aria-labelledby="story-chapters-heading" className="flex flex-col gap-3">
      {/* The heading counts the chapters listed ("15 chapters"), with the facts beside it. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="story-chapters-heading" className="m-0 type-heading text-heading">
          {t('storyPage.chapterCount', { count: chapters.length })}
        </h2>
        <MetaLine facts={headingFacts} />
      </div>
      {chapters.length === 0 && isOwner && (
        <p className="m-0 text-sm text-body">{t('storyPage.noChaptersOwner')}</p>
      )}
      {/* Two columns from 900 px, as on the board; one on narrower screens. */}
      <ol className="m-0 list-none gap-x-12 p-0 min-[900px]:columns-2">
        {chapters.map((chapter) => (
          <ChapterRow
            key={chapter.code}
            chapter={chapter}
            storySlug={storySlug}
            place={place}
            originalLanguage={edition?.facts.originalLanguage ?? null}
          />
        ))}
      </ol>
    </section>
  );
}
