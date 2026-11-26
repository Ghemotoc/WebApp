/**
 * TimelineChapterItem: a dated chapter on the timeline (story S1-E17-20; redrawn by user stories
 * bundle 6, story 6.10, board E29: "Chapters are edited in the editor").
 *
 * "Chapter", then its label and title as a link to the chapter in the writing view, and a meta
 * line saying who tells it, with "draft" while readers can't see it yet. Its place comes from the
 * In-world date and Sort value in its plan, so it has no menu here.
 * Who uses it: TimelineView. What it calls: TimelineRow.
 */
import { Link } from 'react-router';

import type { StorylineChapter } from '../api/storyline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { TimelineRow } from './TimelineRow';

/** What the item needs. */
export interface TimelineChapterItemProps {
  slug: string;
  chapter: StorylineChapter;
  /** "Chapter 1", "Prologue" … */
  label: string;
  /** Who tells it: the Narrator, a character's name, or null while nobody does. */
  povName: string | null;
}

/**
 * Renders the chapter's row.
 *
 * @returns the list item
 */
export function TimelineChapterItem({ slug, chapter, label, povName }: TimelineChapterItemProps) {
  const { t } = useAtlasTranslation();
  const title = chapter.title === '' ? t('storyline.board.untitled') : chapter.title;
  // The meta line: "POV: Mara Rus", with "draft" after it until the chapter is published.
  const facts: string[] = [];
  if (povName !== null) facts.push(t('storyline.board.pov', { name: povName }));
  if (chapter.status !== 'published') facts.push(t('storyline.timeline.draft'));
  return (
    <TimelineRow kind="chapter" date={chapter.worldDate} sortValue={chapter.worldSort}>
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        className="type-label font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {label}: {title}
      </Link>
      {facts.length > 0 && (
        <p className="m-0 type-meta break-words text-ink-muted">{facts.join(' · ')}</p>
      )}
    </TimelineRow>
  );
}
