/**
 * RecentChaptersList: "Chapters" on the at-a-glance page: the chapters edited last (story
 * S1-E17-06; redrawn as board E21 in user stories bundle 6).
 *
 * Flat under a fine line with "Edited recently" under the heading. Each row: the chapter's number
 * and title as a link to the editor, then a meta line with its planning state in bold (Idea to
 * Done, S1-E17-24) once it has a plan, when it went out ("Published today", "Published 9 Oct"),
 * when it will ("Scheduled for Thu 18:00") or that it is a draft, and a draft's last save ("saved
 * 10 minutes ago"). Dates use the interface language (DoD: locale-aware dates).
 * Who uses it: AtAGlance. What it calls: AtlasFlatSection, MetaLine and timeAgo.
 */
import { Link } from 'react-router';

import { type MetaFact, MetaLine } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { RecentChapter, StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFlatSection } from './AtlasFlatSection';
import { dateLocaleFor } from '../../../lib/romania-time';

/**
 * The grey line under a chapter's name.
 *
 * @param chapter - the chapter
 * @param language - the interface language, for the dates
 * @param t - the Story Atlas translations
 * @returns "Published 30 Oct", "Scheduled for Thu 18:00" or "Draft"
 */
function chapterLine(
  chapter: RecentChapter,
  language: string,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  if (chapter.status === 'published' && chapter.publishedAt === null) {
    return t('chapters.line.publishedNoDate');
  }
  if (chapter.status === 'published' && chapter.publishedAt !== null) {
    if (isToday(chapter.publishedAt)) return t('chapters.line.publishedToday');
    const day = new Intl.DateTimeFormat(dateLocaleFor(language), {
      day: 'numeric',
      month: 'short',
    });
    return t('chapters.line.published', { date: day.format(new Date(chapter.publishedAt)) });
  }
  if (chapter.status === 'scheduled' && chapter.scheduledFor !== null) {
    const moment = new Intl.DateTimeFormat(dateLocaleFor(language), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return t('chapters.line.scheduled', { date: moment.format(new Date(chapter.scheduledFor)) });
  }
  return t('chapters.line.draft');
}

/**
 * Whether a moment falls on today's date, in the reader's own time zone.
 *
 * @param isoDate - the moment
 * @returns true for today ("Published today", board E21)
 */
function isToday(isoDate: string): boolean {
  return new Date(isoDate).toDateString() === new Date().toDateString();
}

/** A chapter's number and title, or its number alone. */
function chapterName(
  chapter: RecentChapter,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  if (chapter.title.trim() === '') {
    return t('chapters.chapterUntitled', { number: chapter.position });
  }
  return t('chapters.chapterTitle', { number: chapter.position, title: chapter.title });
}

/** One chapter's row: its name as a link, then its planning state, where it is and when. */
function ChapterRow({ chapter, slug }: { chapter: RecentChapter; slug: string }) {
  const { t, i18n } = useAtlasTranslation();
  const facts: MetaFact[] = [];
  // Step 1: the writer's own planning state first, in bold (Drafting, Done).
  if (chapter.planningStatus !== null) {
    facts.push({ text: t(`chapterPlan.statuses.${chapter.planningStatus}`), kind: 'state' });
  }
  // Step 2: published, scheduled or a draft, and for a draft when it was last saved.
  facts.push({ text: chapterLine(chapter, i18n.language, t) });
  if (chapter.status === 'draft') {
    facts.push({
      text: t('chapters.line.saved', { when: timeAgo(chapter.editedAt, i18n.language) }),
    });
  }
  return (
    <li className="flex flex-col gap-1 border-t border-hairline py-3">
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        className="type-body font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {chapterName(chapter, t)}
      </Link>
      <MetaLine facts={facts} />
    </li>
  );
}

/**
 * Renders the section, or nothing for a story with no chapters yet (the story card says so).
 *
 * @param props.page - the plan, from story_plan()
 * @returns "Chapters", "Edited recently" and the chapters edited last
 */
export function RecentChaptersList({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  if (page.chapters.recent.length === 0) return null;
  return (
    <AtlasFlatSection
      headingId="atlas-chapters-glance-heading"
      heading={t('chapters.heading')}
      note={t('glance.editedRecently')}
    >
      <ul aria-label={t('chapters.recentList')} className="m-0 list-none p-0">
        {page.chapters.recent.map((chapter) => (
          <ChapterRow key={chapter.code} chapter={chapter} slug={page.story.slug} />
        ))}
      </ul>
    </AtlasFlatSection>
  );
}
