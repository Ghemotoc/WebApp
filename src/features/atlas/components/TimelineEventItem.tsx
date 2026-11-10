/**
 * TimelineEventItem: one event on the timeline (story S1-E17-20: "when I edit or delete it, then
 * the change saves (deleting after a second click)").
 *
 * Reads as a line: an "Event" pill (the marker is words, not colour alone), the date, the title
 * and the description. "Edit" opens its fields, each saving by itself, and Delete, which asks
 * twice. The description's [[Name]] links are links when read and chips while editing
 * (S1-E17-31). Who uses it: TimelineView. What it calls: the save and remove props
 * (useStoryline), CrossLinkText and CrossLinkChips.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

import type { StoryEvent, StoryEventChange } from '../api/storyline';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CrossLinkChips } from './CrossLinkChips';
import { CrossLinkText } from './CrossLinkText';
import { PlanTextField } from './PlanTextField';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { TimelineRow } from './TimelineRow';
import { TwoStepDelete } from './TwoStepDelete';

/** What the item needs. */
export interface TimelineEventItemProps {
  event: StoryEvent;
  save: (change: StoryEventChange) => Promise<void>;
  remove: () => Promise<void>;
}

/** "Keep private" and the chapter the event waits for (S1-E17-32, S1-E17-35). */
function EventVisibility({ event }: { event: StoryEvent }) {
  const slug = useOpenStorySlug();
  return (
    <ItemVisibilityControls slug={slug} itemId={event.id} itemName={event.title} allowsGuard />
  );
}

/** The event's fields while it is being edited. */
function EventFields({ event, save, remove }: TimelineEventItemProps) {
  const { t } = useAtlasTranslation();
  const idBase = `atlas-event-${event.id}`;
  return (
    <div className="flex flex-col gap-2">
      <PlanTextField
        id={`${idBase}-title`}
        label={t('storyline.timeline.add.title')}
        savedValue={event.title}
        isValid={(value) => value.trim() !== ''}
        invalidMessage={t('storyline.timeline.add.titleRequired')}
        maxLength={200}
        save={async (value) => save({ title: value })}
      />
      <PlanTextField
        id={`${idBase}-date`}
        label={t('storyline.timeline.add.displayDate')}
        savedValue={event.displayDate}
        maxLength={80}
        save={async (value) => save({ display_date: value })}
      />
      <PlanTextField
        id={`${idBase}-sort`}
        label={t('storyline.timeline.add.sortValue')}
        savedValue={String(event.sortValue)}
        isValid={(typed) => {
          const read = sortValueFrom(typed);
          return read.isValid && read.value !== null;
        }}
        invalidMessage={t('storyline.timeline.sortValueInvalid')}
        save={async (typed) => {
          const read = sortValueFrom(typed);
          if (read.isValid && read.value !== null) await save({ sort_value: read.value });
        }}
      />
      <PlanTextField
        id={`${idBase}-description`}
        label={t('storyline.timeline.add.description')}
        savedValue={event.description}
        isMultiline
        maxLength={5000}
        save={async (value) => save({ description: value })}
      />
      <CrossLinkChips texts={[event.description]} />
      <EventVisibility event={event} />
      <TwoStepDelete
        buttonLabel={t('storyline.timeline.delete')}
        buttonAccessibleName={t('storyline.timeline.deleteNamed', { title: event.title })}
        question={t('storyline.timeline.confirmDelete', { title: event.title })}
        yesLabel={t('storyline.timeline.yes')}
        keepLabel={t('storyline.timeline.keep')}
        failedMessage={t('storyline.timeline.deleteFailed')}
        onDelete={async () => {
          await remove();
          return null;
        }}
      />
    </div>
  );
}

/**
 * Renders the event.
 *
 * @returns the list item, with its fields when it is being edited
 */
export function TimelineEventItem(props: TimelineEventItemProps) {
  const { t } = useAtlasTranslation();
  const { event } = props;
  const [isEditing, setIsEditing] = useState(false);
  return (
    <TimelineRow kind="event" date={event.displayDate} sortValue={event.sortValue}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="m-0 min-w-0 font-bold break-words text-heading">{event.title}</p>
        <InfoPill tone="gold">{t('storyline.timeline.event')}</InfoPill>
      </div>
      {event.description !== '' && !isEditing && (
        <p className="m-0 text-sm break-words whitespace-pre-line text-body">
          <CrossLinkText text={event.description} />
        </p>
      )}
      {isEditing && <EventFields {...props} />}
      <Button
        variant="secondary"
        className="h-9 self-start px-4 text-[13px]"
        aria-expanded={isEditing}
        aria-label={
          isEditing ? undefined : t('storyline.timeline.editNamed', { title: event.title })
        }
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? t('storyline.timeline.done') : t('storyline.timeline.edit')}
      </Button>
    </TimelineRow>
  );
}
