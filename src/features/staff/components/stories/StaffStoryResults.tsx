/**
 * StaffStoryResults: the Staff › Stories list (bundle ADMIN-2, part a; story S1-E11-07; board
 * AdminStories 8.10): each story's title and writer, the owner's short user ID with a Copy button,
 * category, language, status, who can read it, rating, chapters, last update and reports, and an
 * Open link. A table on wide screens and label-row cards on phones (CLAUDE.md rule 21: nothing
 * scrolls sideways at 390 px). No bulk actions (S1-E11-07): each story opens on its own page.
 *
 * Who shows it: StaffStoriesPage. What it reads: the rows from useStaffStories. Never a year of
 * birth, an email or a chapter's words (criterion 3).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { LabelRows } from '@/components/ui/LabelRows';

import type { StaffStoryRow } from '../../api/staffStories';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';
import { ShortUserId } from '../users/ShortUserId';

/**
 * The story cell: the title as a link to the story's staff page, then "@username", "under 18"
 * and the account's status when it isn't active.
 *
 * @returns the cell's content
 */
function StoryCell({ story }: { story: StaffStoryRow }) {
  const { t } = useTranslation('staff');
  const writer = story.ownerHandle === null ? t('shell.noHandle') : `@${story.ownerHandle}`;
  return (
    <span className="flex flex-col gap-0.5">
      <Link to={`/staff/stories/${story.id}`} className="font-semibold text-link underline">
        {story.title}
      </Link>
      <span className="text-sm text-meta">
        {writer}
        {story.ownerIsMinor && <> · {t('stories.under18')}</>}
        {story.ownerStatus !== 'active' && <> · {t(`users.statuses.${story.ownerStatus}`)}</>}
      </span>
    </span>
  );
}

/**
 * The reports cell: "1 open" as a gold pill, or 0, and the closed ones under it.
 *
 * @returns the cell's content
 */
function ReportsCell({ story }: { story: StaffStoryRow }) {
  const { t } = useTranslation('staff');
  return (
    <span className="flex flex-col items-start gap-0.5">
      {story.openReports > 0 ? (
        <InfoPill tone="gold">{t('stories.openCount', { count: story.openReports })}</InfoPill>
      ) : (
        <span>0</span>
      )}
      {story.closedReports > 0 && (
        <span className="text-sm text-meta">
          {t('stories.closedCount', { count: story.closedReports })}
        </span>
      )}
    </span>
  );
}

/**
 * The cells after the story, in column order, with their headings.
 *
 * @returns cellsOf(story) and the headings
 */
function useColumns() {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const headings = [
    t('stories.columns.owner'),
    t('stories.columns.category'),
    t('stories.columns.language'),
    t('stories.columns.status'),
    t('stories.columns.readBy'),
    t('stories.columns.rating'),
    t('stories.columns.chapters'),
    t('stories.columns.updated'),
    t('stories.columns.reports'),
  ];
  const cellsOf = (story: StaffStoryRow): ReactNode[] => [
    <ShortUserId key="owner" userId={story.ownerUserId} />,
    words.category(story.categorySlug),
    <span key="language" lang={story.languageCode}>
      {words.language(story.languageCode)}
    </span>,
    <InfoPill key="status" tone={words.statusTone(story.status)}>
      {words.status(story.status)}
    </InfoPill>,
    words.audience(story.readableBy),
    <InfoPill key="rating" tone="plum">
      {words.rating(story.rating)}
    </InfoPill>,
    String(story.chapterCount),
    words.date(story.updatedAt),
    <ReportsCell key="reports" story={story} />,
  ];
  return { headings, cellsOf };
}

/**
 * The wide-screen table.
 *
 * @returns the table
 */
function StoriesTable({ stories }: { stories: StaffStoryRow[] }) {
  const { t } = useTranslation('staff');
  const { headings, cellsOf } = useColumns();
  return (
    <table className="hidden w-full border-collapse text-sm xl:table">
      <caption className="sr-only">{t('stories.resultsHeading')}</caption>
      <thead>
        <tr className="border-b border-border text-left text-meta">
          {[t('stories.columns.story'), ...headings].map((heading) => (
            <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stories.map((story) => (
          <tr key={story.id} className="border-b border-border align-top">
            <td className="max-w-[220px] py-2.5 pr-4">
              <StoryCell story={story} />
            </td>
            {cellsOf(story).map((cell, index) => (
              <td key={headings[index]} className="py-2.5 pr-4">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Renders the results.
 *
 * @param props.stories - the stories on this page
 * @returns the table and the phone cards
 */
export function StaffStoryResults({ stories }: { stories: StaffStoryRow[] }) {
  const { headings, cellsOf } = useColumns();
  return (
    <>
      <StoriesTable stories={stories} />
      <ul className="m-0 flex list-none flex-col gap-4 p-0 xl:hidden">
        {stories.map((story) => (
          <li key={story.id} className="rounded-card border border-border bg-surface p-4">
            <StoryCell story={story} />
            <LabelRows
              rows={cellsOf(story).map((cell, index) => ({
                label: headings[index] ?? '',
                value: cell,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
