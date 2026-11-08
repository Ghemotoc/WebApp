/**
 * NotPublishedYet: "Drafts and scheduled" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1).
 *
 * Board values: a white card with the eyebrow,
 * the 26 px heading, and one sand row per waiting chapter: a gold "Draft" or sky "Scheduled" pill,
 * "Chapter n: title", the story, words and when it was saved (or when it publishes, Romania time)
 * and an "Edit" or "Reschedule" link to the editor. Newest first, at most four.
 * Who uses it: WriterDashboardTop. Its rows come from writer_dashboard() (the chapters list).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { DashboardChapter } from '../api/dashboard';

import { waitingChapters } from '../lib/dashboardChapters';

/** One waiting chapter's row. */
function WaitingRow({ chapter, storyTitle }: { chapter: DashboardChapter; storyTitle: string }) {
  const { t, i18n } = useTranslation('writing');
  const isScheduled = chapter.status === 'scheduled' && chapter.scheduledFor !== null;
  const title =
    chapter.title === ''
      ? t('dashboard.notPublished.untitled', { number: chapter.position })
      : t('dashboard.notPublished.titled', { number: chapter.position, title: chapter.title });
  const meta = isScheduled
    ? t('dashboard.notPublished.scheduledMeta', {
        when: formatRomaniaDateTime(new Date(chapter.scheduledFor ?? ''), i18n.language),
      })
    : t('dashboard.notPublished.draftMeta', {
        story: storyTitle,
        words: t('manageChapters.meta.words', { count: chapter.wordCount }),
        when: timeAgo(chapter.draftSavedAt ?? new Date().toISOString(), i18n.language),
      });
  return (
    <li className="flex items-start gap-3.5 rounded-2xl border border-hairline bg-paper p-4">
      <InfoPill tone={isScheduled ? 'sky' : 'gold'}>
        {t(`manageChapters.state.${isScheduled ? 'scheduled' : 'draft'}`)}
      </InfoPill>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold break-words text-ink">{title}</span>
        <span className="text-[13px] text-meta">{meta}</span>
      </span>
      <Link
        to={`/write/s/${chapter.storySlug}/c/${chapter.chapterCode}`}
        aria-label={`${t(isScheduled ? 'dashboard.notPublished.reschedule' : 'dashboard.notPublished.edit')}: ${title}`}
        className="inline-flex min-h-6 flex-none items-center text-sm font-semibold"
      >
        {t(isScheduled ? 'dashboard.notPublished.reschedule' : 'dashboard.notPublished.edit')}
      </Link>
    </li>
  );
}

/** What the card needs. */
export interface NotPublishedYetProps {
  chapters: DashboardChapter[];
  /** Story titles by slug, for the draft rows' meta line. */
  storyTitles: Map<string, string>;
}

/**
 * Renders the card.
 *
 * @param props.chapters - every chapter of every story
 * @param props.storyTitles - story titles by slug
 * @returns the card
 */
export function NotPublishedYet({ chapters, storyTitles }: NotPublishedYetProps) {
  const { t } = useTranslation('writing');
  const waiting = waitingChapters(chapters);
  return (
    <section
      aria-labelledby="dashboard-waiting-heading"
      className="relative flex flex-col gap-3.5 rounded-3xl border border-border bg-surface px-[26px] py-6 shadow-card"
    >
      {/* The heading stops short of the card's right side, where the pencil cup sits. */}
      <div className="flex flex-col gap-1.5 pr-28">
        <Eyebrow>{t('dashboard.notPublished.eyebrow')}</Eyebrow>
        <h2
          id="dashboard-waiting-heading"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {t('dashboard.notPublished.heading')}
        </h2>
      </div>
      {waiting.length === 0 ? (
        <p className="m-0 text-body">{t('dashboard.notPublished.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {waiting.map((chapter) => (
            <WaitingRow
              key={chapter.chapterCode}
              chapter={chapter}
              storyTitle={storyTitles.get(chapter.storySlug) ?? ''}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
