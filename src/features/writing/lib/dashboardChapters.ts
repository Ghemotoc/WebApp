/**
 * Which state a dashboard chapter is in, and which chapters are still waiting (story S1-E3-07).
 *
 * Who calls it: ChapterStatsTable (the pills), NotPublishedYet (the waiting list) and
 * YourWritingPage ("Continue draft"). What it calls: nothing; it reads writer_dashboard()'s rows.
 */
import type { DashboardChapter } from '../api/dashboard';

/** A chapter's state as the board's pill shows it. */
export type DashboardChapterState = 'published' | 'draft' | 'scheduled' | 'unpublished';

/**
 * A chapter's state: a draft that was published once is "unpublished" (S1-E3-04).
 *
 * @param chapter - the chapter's row
 * @returns its state
 */
export function dashboardChapterState(chapter: DashboardChapter): DashboardChapterState {
  if (chapter.status === 'draft' && chapter.unpublishedAt !== null) return 'unpublished';
  return chapter.status;
}

/** How many waiting chapters the card lists. */
const mostShown = 4;

/**
 * The chapters still waiting, the most recently touched first: drafts (never published) and
 * scheduled ones. An unpublished chapter has its own place in Manage chapters.
 *
 * @param chapters - every chapter of every story
 * @returns at most four
 */
export function waitingChapters(chapters: DashboardChapter[]): DashboardChapter[] {
  const waiting = chapters.filter((chapter) => {
    const state = dashboardChapterState(chapter);
    return state === 'draft' || state === 'scheduled';
  });
  const touched = (chapter: DashboardChapter) => chapter.scheduledFor ?? chapter.draftSavedAt ?? '';
  return [...waiting]
    .sort((first, second) => touched(second).localeCompare(touched(first)))
    .slice(0, mostShown);
}
