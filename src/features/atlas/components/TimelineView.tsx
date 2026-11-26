/**
 * TimelineView: the story's in-world timeline (story S1-E17-20; redrawn by user stories bundle 6,
 * story 6.10, board E29).
 *
 * Two columns from 1024 px (1.3 to 1): on the left the hint and one list of events and dated
 * chapters, earliest first by sort value, each row saying "Event" or "Chapter" in words; on the
 * right "Add an event" and "Chapters without a date". On a phone the columns stack.
 * Who uses it: StorylinePage. What it calls: lib/timeline.ts, TimelineEventItem,
 * TimelineChapterItem, AddEventForm and UndatedChapters.
 */
import type {
  NewStoryEvent,
  StoryEvent,
  Storyline,
  StorylineChapter,
  StoryEventChange,
} from '../api/storyline';
import { timelineItems, undatedChapters } from '../lib/timeline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddEventForm } from './AddEventForm';
import { TimelineChapterItem } from './TimelineChapterItem';
import { TimelineEventItem } from './TimelineEventItem';
import { UndatedChapters } from './UndatedChapters';

/** What the timeline needs. */
export interface TimelineViewProps {
  slug: string;
  storyline: Storyline;
  labelOf: (code: string) => string;
  addEvent: (event: NewStoryEvent) => Promise<void>;
  saveEvent: (eventId: string, change: StoryEventChange) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
}

/** The list's id, so the focus can land on it once an event is deleted. */
const listId = 'atlas-timeline-list';

/** Who tells a chapter, as on the board's cards: the Narrator, a character, or nobody yet. */
function useTellerOf(storyline: Storyline) {
  const { t } = useAtlasTranslation();
  return (chapter: StorylineChapter) => {
    if (chapter.povIsNarrator) return t('chapterPlan.narrator');
    const character = storyline.characters.find(
      (candidate) => candidate.id === chapter.povCharacterId,
    );
    return character?.name ?? null;
  };
}

/** One event's row, with Undo adding it back exactly as it was. */
function EventRow({ event, props }: { event: StoryEvent; props: TimelineViewProps }) {
  return (
    <TimelineEventItem
      event={event}
      save={async (change) => props.saveEvent(event.id, change)}
      remove={async () => props.removeEvent(event.id)}
      putBack={async () =>
        props.addEvent({
          title: event.title,
          displayDate: event.displayDate,
          sortValue: event.sortValue,
          description: event.description,
        })
      }
      onRemoved={() => document.getElementById(listId)?.focus()}
    />
  );
}

/** The hint and the sorted list (or a line saying it is empty). */
function TimelineList(props: TimelineViewProps) {
  const { t } = useAtlasTranslation();
  const { slug, storyline, labelOf } = props;
  const tellerOf = useTellerOf(storyline);
  const items = timelineItems(storyline.chapters, storyline.events);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 type-meta text-ink-muted">{t('storyline.timeline.hint')}</p>
      {items.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('storyline.timeline.empty')}</p>
      )}
      {/* tabIndex -1: the focus can land here after a delete, without adding a tab stop. */}
      <ul
        id={listId}
        tabIndex={-1}
        aria-label={t('storyline.timeline.listLabel')}
        className="m-0 flex list-none flex-col p-0 focus:outline-none"
      >
        {items.map((item) =>
          item.type === 'event' ? (
            <EventRow key={`event-${item.event.id}`} event={item.event} props={props} />
          ) : (
            <TimelineChapterItem
              key={`chapter-${item.chapter.code}`}
              slug={slug}
              chapter={item.chapter}
              label={labelOf(item.chapter.code)}
              povName={tellerOf(item.chapter)}
            />
          ),
        )}
      </ul>
    </div>
  );
}

/**
 * Renders the timeline.
 *
 * @returns the list on the left, and the form and the undated chapters on the right
 */
export function TimelineView(props: TimelineViewProps) {
  const { t } = useAtlasTranslation();
  const { slug, storyline, labelOf } = props;
  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <TimelineList {...props} />
      <aside aria-label={t('storyline.timeline.sideLabel')} className="flex min-w-0 flex-col gap-8">
        <AddEventForm onAdd={props.addEvent} />
        <UndatedChapters
          slug={slug}
          chapters={storyline.chapters}
          undated={undatedChapters(storyline.chapters)}
          labelOf={labelOf}
        />
      </aside>
    </div>
  );
}
