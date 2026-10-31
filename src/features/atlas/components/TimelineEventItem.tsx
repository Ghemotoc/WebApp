/**
 * TimelineEventItem: one event on the timeline (story S1-E17-20: "when I edit or delete it, then
 * the change saves (deleting after a second click)").
 *
 * Reads as a line: an "Event" pill (the marker is words, not colour alone), the date, the title
 * and the description. "Edit" opens its fields, each saving by itself, and Delete, which asks
 * twice. Who uses it: TimelineView. What it calls: the save and remove props (useStoryline).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

import type { StoryEvent, StoryEventChange } from '../api/storyline';
import { sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';
import { TwoStepDelete } from './TwoStepDelete';

/** What the item needs. */
export interface TimelineEventItemProps {
  event: StoryEvent;
  save: (change: StoryEventChange) => Promise<void>;
  remove: () => Promise<void>;
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
    <li
      data-testid="atlas-timeline-item"
      className="flex flex-col gap-2 border-b border-hairline py-4 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-2">
        <InfoPill tone="gold">{t('storyline.timeline.event')}</InfoPill>
        {event.displayDate !== '' && <span className="text-sm text-meta">{event.displayDate}</span>}
      </div>
      <p className="m-0 font-semibold break-words text-heading">{event.title}</p>
      {event.description !== '' && !isEditing && (
        <p className="m-0 text-sm break-words whitespace-pre-line text-body">{event.description}</p>
      )}
      {isEditing && <EventFields {...props} />}
      <Button
        variant="secondary"
        className="self-start"
        aria-expanded={isEditing}
        aria-label={
          isEditing ? undefined : t('storyline.timeline.editNamed', { title: event.title })
        }
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? t('storyline.timeline.done') : t('storyline.timeline.edit')}
      </Button>
    </li>
  );
}
