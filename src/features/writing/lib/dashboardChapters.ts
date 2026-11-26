/**
 * Which state a dashboard chapter is in, and which chapters are still waiting (story S1-E3-07).
 *
 * Who calls it: ChapterStatsTable (the pills), NotPublishedYet (the waiting list) and
 * YourWritingPage ("Continue draft", the comment total beside "Latest comments" and each story's
 * "last updated"). What it calls: nothing; it reads writer_dashboard()'s rows.
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

/**
 * Every comment on the writer's chapters, all time, for "View 72 comments" beside "Latest
 * comments" (board D01, user story 5.1). It adds up each chapter's count; when any chapter shows
 * "fewer than 5" (null), the total can't be told without giving that number away, so it is null.
 *
 * @param chapters - every chapter of every story, with its all-time comment count
 * @returns the total, or null when a chapter's count is hidden
 */
export function allTimeCommentCount(chapters: DashboardChapter[]): number | null {
  let total = 0;
  for (const chapter of chapters) {
    // A draft or scheduled chapter has no comments yet and no count at all.
    if (chapter.status !== 'published') continue;
    if (chapter.comments === null) return null;
    total += chapter.comments;
  }
  return total;
}

/**
 * When a story last changed for readers: the newest first publication or edit among its published
 * chapters ("last updated 10 October" in the story's meta line, board D01, user story 5.1).
 *
 * @param chapters - the story's own chapters
 * @returns the timestamp, or null while nothing is published
 */
export function storyLastUpdatedAt(chapters: DashboardChapter[]): string | null {
  let newest: string | null = null;
  for (const chapter of chapters) {
    if (chapter.status !== 'published') continue;
    // Step 1: the chapter's own newest moment, an edit after publishing or the publishing.
    const moment = chapter.editedAt ?? chapter.firstPublishedAt;
    // Step 2: keep it when it is newer than the newest so far (ISO timestamps sort as text).
    if (moment !== null && (newest === null || moment > newest)) newest = moment;
  }
  return newest;
}
