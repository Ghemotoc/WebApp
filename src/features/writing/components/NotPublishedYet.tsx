/**
 * NotPublishedYet: "Drafts and scheduled" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1).
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): a plain heading and one row per
 * waiting chapter split by the hairline: a meta line with the state first in bold ("Draft",
 * "Scheduled") and the story, "Chapter n: title" as a link, a meta line with the words and when it
 * was saved (or when it publishes, on the writer's own clock), and "Edit" or "Reschedule" as a
 * quiet button. Newest first, at most four. No card and no pills.
 * Who uses it: WriterDashboardTop. Its rows come from writer_dashboard() (the chapters list).
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { formatLocalDateTime } from '@/lib/local-time';

import type { DashboardChapter } from '../api/dashboard';
import { waitingChapters } from '../lib/dashboardChapters';

/** What one waiting chapter's row needs. */
interface WaitingRowProps {
  chapter: DashboardChapter;
  storyTitle: string;
}

/**
 * The chapter's title as the row shows it ("Chapter 7: Saturday at the Shop", or untitled).
 *
 * @param chapter - the waiting chapter
 * @param t - the writing translations
 * @returns the title
 */
function rowTitle(chapter: DashboardChapter, t: TFunction<'writing'>) {
  if (chapter.title === '') {
    return t('dashboard.notPublished.untitled', { number: chapter.position });
  }
  return t('dashboard.notPublished.titled', { number: chapter.position, title: chapter.title });
}

/**
 * The row's second meta line: when it publishes, or how long it is and when it was saved.
 *
 * @param chapter - the waiting chapter
 * @param isScheduled - whether it has a publishing time
 * @param t - the writing translations
 * @param language - the interface language, for the date and "2 hours ago"
 * @returns the facts
 */
function detailFacts(
  chapter: DashboardChapter,
  isScheduled: boolean,
  t: TFunction<'writing'>,
  language: string,
): MetaFact[] {
  if (isScheduled) {
    const when = formatLocalDateTime(new Date(chapter.scheduledFor ?? ''), language);
    return [{ text: t('dashboard.notPublished.scheduledMeta', { when }) }];
  }
  const savedAt = chapter.draftSavedAt ?? new Date().toISOString();
  return [
    { text: t('manageChapters.meta.words', { count: chapter.wordCount }) },
    { text: t('dashboard.notPublished.savedWhen', { when: timeAgo(savedAt, language) }) },
  ];
}

/**
 * One waiting chapter: a meta line with the state first and the story, the chapter's title as a
 * link, a meta line with the words and when it was saved (or when it publishes), and Edit or
 * Reschedule as a quiet button (board simplified/New-Write).
 *
 * @param props - the chapter and its story's title
 * @returns one list item
 */
function WaitingRow({ chapter, storyTitle }: WaitingRowProps) {
  const { t, i18n } = useTranslation('writing');
  const isScheduled = chapter.status === 'scheduled' && chapter.scheduledFor !== null;
  const title = rowTitle(chapter, t);
  const editorAddress = `/write/s/${chapter.storySlug}/c/${chapter.chapterCode}`;
  const action = t(
    isScheduled ? 'dashboard.notPublished.reschedule' : 'dashboard.notPublished.edit',
  );
  const detail = detailFacts(chapter, isScheduled, t, i18n.language);
  return (
    <li className="flex items-center gap-4 border-t border-hairline py-3.5 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <MetaLine
          facts={[
            {
              text: t(`manageChapters.state.${isScheduled ? 'scheduled' : 'draft'}`),
              kind: 'state',
            },
            { text: storyTitle },
          ]}
        />
        <Link
          to={editorAddress}
          className="text-[15px] leading-5 font-semibold break-words text-heading no-underline hover:underline"
        >
          {title}
        </Link>
        <MetaLine facts={detail} />
      </span>
      <Link
        to={editorAddress}
        aria-label={`${action}: ${title}`}
        className={buttonClassName({ variant: 'secondary' })}
      >
        {action}
      </Link>
    </li>
  );
}

/** What the section needs. */
export interface NotPublishedYetProps {
  chapters: DashboardChapter[];
  /** Story titles by slug, for the rows' meta lines. */
  storyTitles: Map<string, string>;
}

/**
 * Renders "Not published yet".
 *
 * @param props - the dashboard's chapters and the story titles
 * @returns the section with one row per draft or scheduled chapter, or a line saying none wait
 */
export function NotPublishedYet({ chapters, storyTitles }: NotPublishedYetProps) {
  const { t } = useTranslation('writing');
  const waiting = waitingChapters(chapters);
  return (
    <section aria-labelledby="dashboard-waiting-heading" className="flex min-w-0 flex-col gap-2">
      <h2 id="dashboard-waiting-heading" className="m-0 type-heading text-heading">
        {t('dashboard.notPublished.heading')}
      </h2>
      {waiting.length === 0 ? (
        <p className="m-0 type-body text-body">{t('dashboard.notPublished.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
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
