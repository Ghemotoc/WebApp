/**
 * StoryChapterList: "Chapters" on the story page (story S1-E3-03; board Story 3.4, the chapter
 * list).
 *
 * Board values: a card with the eyebrow "Chapters" and one row per chapter, a fine line between
 * rows: "Chapter n", the title in Funnel Display, and the published date (with "Edited …" when the
 * writer updated it). Readers see only published chapters; the owner's preview also lists drafts
 * and scheduled chapters with a pill. A published chapter's title links to the chapter reader
 * (S1-E4-01a); a draft or scheduled one stays plain text, because readers can't open it.
 * "You are here" (IDEAS-1 part a, IDEA-20261031-4): a signed-in reader's latest place in the
 * story is marked beside its chapter, in words ("You are here, 42%"), and the mark is a link that
 * opens the chapter at that place (the address ends "#resume", which the reader jumps to).
 * Who uses it: StoryPage. What it calls: useStoryLibraryState → story_library_state(), the same
 * place "Continue chapter n" uses.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import type { StoryPlace } from '@/features/library/api/library';
import { useStoryLibraryState } from '@/features/library/hooks/useStoryLibraryState';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { StoryPageChapter } from '../api/storyPage';

/** The "You are here" link beside the chapter the reader stopped in. */
function YouAreHere(props: { place: StoryPlace; storySlug: string; chapterNumber: number }) {
  const { t } = useTranslation('reading');
  const { place, storySlug, chapterNumber } = props;
  return (
    <Link
      to={`/s/${storySlug}/${place.chapterCode}#resume`}
      aria-label={t('storyPage.youAreHereLink', { percent: place.percent, number: chapterNumber })}
      className="relative inline-flex h-8 items-center justify-center rounded-full border border-control-border bg-surface px-3 text-[13px] leading-none font-semibold text-heading after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] hover:bg-tint"
    >
      {t('storyPage.youAreHere', { percent: place.percent })}
    </Link>
  );
}

/** The date line under a chapter's title. */
function ChapterDates({ chapter }: { chapter: StoryPageChapter }) {
  const { t, i18n } = useTranslation('reading');
  const parts: string[] = [];
  if (chapter.publishedAt !== null) {
    parts.push(
      t('storyPage.publishedOn', {
        date: formatRomaniaDate(new Date(chapter.publishedAt), i18n.language),
      }),
    );
  }
  if (chapter.editedAt !== null) {
    parts.push(
      t('storyPage.editedOn', {
        date: formatRomaniaDate(new Date(chapter.editedAt), i18n.language),
      }),
    );
  }
  if (parts.length === 0) return null;
  return <p className="m-0 text-[13px] text-meta">{parts.join(' · ')}</p>;
}

/** The title: a link to the reader when the chapter is published, plain text otherwise. */
function ChapterTitle({ chapter, storySlug }: { chapter: StoryPageChapter; storySlug: string }) {
  const { t } = useTranslation('reading');
  const title = chapter.title === '' ? t('storyPage.untitledChapter') : chapter.title;
  return (
    <p className="m-0 font-heading text-lg font-bold break-words text-heading">
      {chapter.status === 'published' ? (
        <Link to={`/s/${storySlug}/${chapter.code}`} className="text-heading hover:underline">
          {title}
        </Link>
      ) : (
        title
      )}
    </p>
  );
}

/** One row: the number, the title, a pill for the owner's unpublished chapters, the dates. */
function ChapterRow(props: {
  chapter: StoryPageChapter;
  storySlug: string;
  place: StoryPlace | null;
}) {
  const { chapter, storySlug, place } = props;
  const { t } = useTranslation('reading');
  const isHere =
    place !== null && place.chapterCode === chapter.code && chapter.status === 'published';
  return (
    <li className="flex flex-col gap-1 border-t border-border py-3.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-meta">
          {t('storyPage.chapterNumber', { number: chapter.number })}
        </span>
        {chapter.status === 'draft' && (
          <InfoPill tone="neutral">{t('storyPage.draftChapter')}</InfoPill>
        )}
        {chapter.status === 'scheduled' && (
          <InfoPill tone="gold">{t('storyPage.scheduledChapter')}</InfoPill>
        )}
        {isHere && (
          <YouAreHere place={place} storySlug={storySlug} chapterNumber={chapter.number} />
        )}
      </div>
      <ChapterTitle chapter={chapter} storySlug={storySlug} />
      <ChapterDates chapter={chapter} />
    </li>
  );
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
}: {
  chapters: StoryPageChapter[];
  isOwner: boolean;
  /** The story's address, for each chapter's link to the reader. */
  storySlug: string;
}) {
  const { t } = useTranslation('reading');
  // The reader's latest place in the story; null signed out or before they read.
  const { state } = useStoryLibraryState(storySlug);
  const place = state?.place ?? null;
  return (
    <section
      aria-labelledby="story-chapters-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="story-chapters-heading" className="m-0 w-fit eyebrow">
        {t('storyPage.chaptersHeading')}
      </h2>
      {chapters.length === 0 && isOwner && (
        <p className="m-0 text-sm text-body">{t('storyPage.noChaptersOwner')}</p>
      )}
      <ol className="m-0 list-none p-0">
        {chapters.map((chapter) => (
          <ChapterRow key={chapter.code} chapter={chapter} storySlug={storySlug} place={place} />
        ))}
      </ol>
    </section>
  );
}
