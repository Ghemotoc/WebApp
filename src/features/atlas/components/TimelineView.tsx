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
import { GlassList } from './GlassList';
import { GlassListRow } from './GlassListRow';
import { TimelineEventItem } from './TimelineEventItem';
import { TimelineRow } from './TimelineRow';

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
    <TimelineRow kind="chapter" date={chapter.worldDate} sortValue={chapter.worldSort}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          to={`/write/s/${slug}/c/${chapter.code}`}
          className="min-w-0 font-bold break-words text-heading no-underline hover:underline"
        >
          {label}: {chapter.title === '' ? t('storyline.board.untitled') : chapter.title}
        </Link>
        <InfoPill tone="plum">{t('storyline.timeline.chapter')}</InfoPill>
      </div>
    </TimelineRow>
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
    <div className="flex min-w-0 flex-col gap-2">
      <GlassList
        id="atlas-undated-heading"
        label={t('storyline.timeline.undatedHeading')}
        headingLevel={2}
      >
        {chapters.map((chapter) => (
          <GlassListRow
            key={chapter.code}
            to={`/write/s/${slug}/c/${chapter.code}`}
            title={`${labelOf(chapter.code)}: ${chapter.title === '' ? t('storyline.board.untitled') : chapter.title}`}
            line={t('storyline.timeline.noDateYet')}
          />
        ))}
      </GlassList>
      <p className="m-0 px-[18px] text-sm text-meta">
        {chapters.length === 0
          ? t('storyline.timeline.undatedNone')
          : t('storyline.timeline.undatedHint')}
      </p>
    </div>
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
    <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-4">
        {items.length === 0 && <p className="m-0 text-body">{t('storyline.timeline.empty')}</p>}
        <div className="relative">
          {/* The rail the dots sit on; decoration only, and left out on a phone. */}
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-[146px] hidden w-[3px] rounded-full bg-hairline sm:block"
          />
          <ol
            aria-label={t('storyline.timeline.listLabel')}
            className="relative m-0 flex list-none flex-col gap-3.5 p-0"
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
        </div>
      </div>
      <aside
        aria-label={t('storyline.timeline.sideLabel')}
        className="flex min-w-0 flex-col gap-[18px]"
      >
        <AddEventForm onAdd={props.addEvent} />
        <UndatedChapters
          slug={slug}
          chapters={undatedChapters(storyline.chapters)}
          labelOf={labelOf}
        />
      </aside>
    </div>
  );
}
