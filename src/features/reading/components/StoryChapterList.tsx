/**
 * StoryChapterList: "Chapters" on the story page (story S1-E3-03; board Story 3.4, the chapter
 * list).
 *
 * Board values: a card with the eyebrow "Chapters" and one row per chapter, a fine line between
 * rows: "Chapter n", the title in Bricolage, and the published date (with "Edited …" when the
 * writer updated it). Readers see only published chapters; the owner's preview also lists drafts
 * and scheduled chapters with a pill. A published chapter's title links to the chapter reader
 * (S1-E4-01a); a draft or scheduled one stays plain text, because readers can't open it.
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { StoryPageChapter } from '../api/storyPage';

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
function ChapterRow({ chapter, storySlug }: { chapter: StoryPageChapter; storySlug: string }) {
  const { t } = useTranslation('reading');
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
  return (
    <section
      aria-labelledby="story-chapters-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="story-chapters-heading"
        className="m-0 w-fit font-eyebrow text-sm font-normal text-eyebrow"
      >
        {t('storyPage.chaptersHeading')}
      </h2>
      {chapters.length === 0 && isOwner && (
        <p className="m-0 text-sm text-body">{t('storyPage.noChaptersOwner')}</p>
      )}
      <ol className="m-0 list-none p-0">
        {chapters.map((chapter) => (
          <ChapterRow key={chapter.code} chapter={chapter} storySlug={storySlug} />
        ))}
      </ol>
    </section>
  );
}
