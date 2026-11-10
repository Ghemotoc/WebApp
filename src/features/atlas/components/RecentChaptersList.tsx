/**
 * RecentChaptersList: the chapters edited last on the at-a-glance page (story S1-E17-06; bundle
 * G10a, board AtlasStory: "Chapters · edited recently").
 *
 * A glass list: each chapter's number and title, a line saying when it went out ("Published
 * 30 Oct"), when it will ("Scheduled for Thu 18:00") or that it is a draft, and its planning
 * status pill (Idea to Done, S1-E17-24) once it has a plan. Each row opens the chapter editor.
 * Dates use the interface language (DoD: locale-aware dates).
 * Who uses it: AtAGlance. What it calls: GlassList, GlassListRow and PlanningStatusPill.
 */
import type { RecentChapter, StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { GlassList } from './GlassList';
import { GlassListRow } from './GlassListRow';
import { PlanningStatusPill } from './PlanningStatusPill';

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
  if (chapter.status === 'published' && chapter.publishedAt !== null) {
    const day = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });
    return t('chapters.line.published', { date: day.format(new Date(chapter.publishedAt)) });
  }
  if (chapter.status === 'scheduled' && chapter.scheduledFor !== null) {
    const moment = new Intl.DateTimeFormat(language, {
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

/**
 * Renders the list, or nothing for a story with no chapters yet (the Chapters tile says so).
 *
 * @returns the glass list of recent chapters
 */
export function RecentChaptersList({ page }: { page: StoryPlanPage }) {
  const { t, i18n } = useAtlasTranslation();
  if (page.chapters.recent.length === 0) return null;
  return (
    <GlassList id="atlas-chapters-glance" label={t('chapters.recentList')}>
      {page.chapters.recent.map((chapter) => (
        <GlassListRow
          key={chapter.code}
          to={`/write/s/${page.story.slug}/c/${chapter.code}`}
          title={chapterName(chapter, t)}
          line={chapterLine(chapter, i18n.language, t)}
          end={
            chapter.planningStatus === null ? undefined : (
              <PlanningStatusPill status={chapter.planningStatus} />
            )
          }
        />
      ))}
    </GlassList>
  );
}
