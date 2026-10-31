/**
 * TimelineView: the story's in-world timeline (story S1-E17-20).
 *
 * "Add an event", then events and dated chapters sorted together by sort value: an event carries
 * an "Event" pill and a chapter a "Chapter" pill with its label, so the two differ in words, not
 * only colour. Chapters without a sort value are listed apart, each a link to its plan in the
 * writing view, so the writer can date them.
 * Who uses it: StorylinePage. What it calls: lib/timeline.ts, AddEventForm and
 * TimelineEventItem.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';

import type {
  NewStoryEvent,
  Storyline,
  StorylineChapter,
  StoryEventChange,
} from '../api/storyline';
import { timelineItems, undatedChapters } from '../lib/timeline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddEventForm } from './AddEventForm';
import { TimelineEventItem } from './TimelineEventItem';

/** What the timeline needs. */
export interface TimelineViewProps {
  slug: string;
  storyline: Storyline;
  labelOf: (code: string) => string;
  addEvent: (event: NewStoryEvent) => Promise<void>;
  saveEvent: (eventId: string, change: StoryEventChange) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
}

/** A dated chapter's line: the pill, the date and the chapter as a link to its plan. */
function TimelineChapterItem({
  slug,
  chapter,
  label,
}: {
  slug: string;
  chapter: StorylineChapter;
  label: string;
}) {
  const { t } = useAtlasTranslation();
  return (
    <li
      data-testid="atlas-timeline-item"
      className="flex flex-col gap-2 border-b border-hairline py-4 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-2">
        <InfoPill tone="plum">{t('storyline.timeline.chapter')}</InfoPill>
        {chapter.worldDate !== '' && <span className="text-sm text-meta">{chapter.worldDate}</span>}
      </div>
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        className="font-semibold break-words text-link"
      >
        {label}: {chapter.title === '' ? t('storyline.board.untitled') : chapter.title}
      </Link>
    </li>
  );
}

/** The chapters still without a place, as links to their plans. */
function UndatedChapters({
  slug,
  chapters,
  labelOf,
}: {
  slug: string;
  chapters: StorylineChapter[];
  labelOf: (code: string) => string;
}) {
  const { t } = useAtlasTranslation();
  return (
    <section aria-labelledby="atlas-undated-heading" className="flex flex-col gap-2">
      <h3 id="atlas-undated-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('storyline.timeline.undatedHeading')}
      </h3>
      {chapters.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('storyline.timeline.undatedNone')}</p>
      )}
      {chapters.length > 0 && (
        <>
          <p className="m-0 text-sm text-meta">{t('storyline.timeline.undatedHint')}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {chapters.map((chapter) => (
              <li key={chapter.code}>
                <Link
                  to={`/write/s/${slug}/c/${chapter.code}`}
                  className="inline-flex min-h-11 items-center text-link"
                >
                  {labelOf(chapter.code)}:{' '}
                  {chapter.title === '' ? t('storyline.board.untitled') : chapter.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Renders the timeline.
 *
 * @returns the form, the sorted list and the undated chapters
 */
export function TimelineView(props: TimelineViewProps) {
  const { t } = useAtlasTranslation();
  const { slug, storyline, labelOf } = props;
  const items = timelineItems(storyline.chapters, storyline.events);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <AddEventForm onAdd={props.addEvent} />
      {items.length === 0 && <p className="m-0 text-body">{t('storyline.timeline.empty')}</p>}
      <ol
        aria-label={t('storyline.timeline.listLabel')}
        className="m-0 flex list-none flex-col p-0"
      >
        {items.map((item) =>
          item.type === 'event' ? (
            <TimelineEventItem
              key={`event-${item.event.id}`}
              event={item.event}
              save={async (change) => props.saveEvent(item.event.id, change)}
              remove={async () => props.removeEvent(item.event.id)}
            />
          ) : (
            <TimelineChapterItem
              key={`chapter-${item.chapter.code}`}
              slug={slug}
              chapter={item.chapter}
              label={labelOf(item.chapter.code)}
            />
          ),
        )}
      </ol>
      <UndatedChapters
        slug={slug}
        chapters={undatedChapters(storyline.chapters)}
        labelOf={labelOf}
      />
    </div>
  );
}
