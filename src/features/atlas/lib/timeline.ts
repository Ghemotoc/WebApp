/**
 * timeline: the timeline's order (story S1-E17-20): events and dated chapters together, sorted
 * by their sort value, and the chapters still without one.
 *
 * Who calls it: components/TimelineView.tsx. What it calls: nothing.
 */
import type { StoryEvent, StorylineChapter } from '../api/storyline';

/** One line of the timeline: an event or a dated chapter. */
export type TimelineItem =
  | { type: 'event'; sortValue: number; event: StoryEvent }
  | { type: 'chapter'; sortValue: number; chapter: StorylineChapter };

/**
 * Sorts events and dated chapters together.
 *
 * @param chapters - the chapters in book order
 * @param events - the events
 * @returns the timeline, earliest first; on the same value events come first, then chapters in
 *   book order (the sort is stable, so each keeps its own order)
 */
export function timelineItems(chapters: StorylineChapter[], events: StoryEvent[]): TimelineItem[] {
  const eventItems: TimelineItem[] = events.map((event) => ({
    type: 'event',
    sortValue: event.sortValue,
    event,
  }));
  const chapterItems: TimelineItem[] = [];
  for (const chapter of chapters) {
    if (chapter.worldSort !== null) {
      chapterItems.push({ type: 'chapter', sortValue: chapter.worldSort, chapter });
    }
  }
  return [...eventItems, ...chapterItems].sort(
    (first, second) => first.sortValue - second.sortValue,
  );
}

/**
 * The chapters with no sort value yet, listed apart so the writer can date them.
 *
 * @param chapters - the chapters in book order
 * @returns the undated ones, in book order
 */
export function undatedChapters(chapters: StorylineChapter[]): StorylineChapter[] {
  return chapters.filter((chapter) => chapter.worldSort === null);
}
