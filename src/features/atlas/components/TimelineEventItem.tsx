/**
 * TimelineEventItem: one event on the timeline (story S1-E17-20; redrawn by user stories bundle
 * 6, story 6.10, board E29: "More on an event: Edit (in place, with Done) and Delete (“Removed.
 * Undo” for 8 seconds)").
 *
 * Reads as a row: "Event", the title and the description as a meta line, whose [[Name]] links
 * are links (S1-E17-31). The "…" More menu holds Edit, which opens the fields in place (each
 * saves by itself) with Done to close them, and Delete, which deletes at once and offers Undo in
 * the shared note for 8 seconds (design books item 14); Undo adds the event back with the same
 * title, date, sort value and description.
 * Who uses it: TimelineView. What it calls: the save, remove and putBack props (useStoryline),
 * RowMoreMenu, useUndo, CrossLinkText, CrossLinkChips and ItemVisibilityControls.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useUndo } from '@/lib/undo/useUndo';

import type { StoryEvent, StoryEventChange } from '../api/storyline';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CrossLinkChips } from './CrossLinkChips';
import { CrossLinkText } from './CrossLinkText';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { PlanTextField } from './PlanTextField';
import { RowMoreMenu } from './RowMoreMenu';
import { TimelineRow } from './TimelineRow';

/** What the item needs. */
export interface TimelineEventItemProps {
  event: StoryEvent;
  save: (change: StoryEventChange) => Promise<void>;
  /** Deletes the event; throws when it can't. */
  remove: () => Promise<void>;
  /** Adds the deleted event back (Undo); throws when it can't. */
  putBack: () => Promise<void>;
  /** Called once the event is deleted, so the focus has somewhere to go. */
  onRemoved: () => void;
}

/** The sort value box: it saves only a number, as the form asks. */
function SortValueField({ event, save }: Pick<TimelineEventItemProps, 'event' | 'save'>) {
  const { t } = useAtlasTranslation();
  return (
    <PlanTextField
      id={`atlas-event-${event.id}-sort`}
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
  );
}

/** The event's fields while it is being edited, then Done. */
function EventFields({
  event,
  save,
  onDone,
}: Pick<TimelineEventItemProps, 'event' | 'save'> & { onDone: () => void }) {
  const { t } = useAtlasTranslation();
  const slug = useOpenStorySlug();
  const idBase = `atlas-event-${event.id}`;
  return (
    <div className="mt-2 flex flex-col gap-3">
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
      <SortValueField event={event} save={save} />
      <PlanTextField
        id={`${idBase}-description`}
        label={t('storyline.timeline.add.description')}
        savedValue={event.description}
        isMultiline
        maxLength={5000}
        save={async (value) => save({ description: value })}
      />
      <CrossLinkChips texts={[event.description]} />
      {/* "Keep private" and the chapter the event waits for (S1-E17-32, S1-E17-35). */}
      <ItemVisibilityControls slug={slug} itemId={event.id} itemName={event.title} allowsGuard />
      <Button variant="secondary" className="self-start" onClick={onDone}>
        {t('storyline.timeline.done')}
      </Button>
    </div>
  );
}

/**
 * Deletes the event at once and offers Undo in the shared note, or says plainly that it couldn't.
 *
 * @returns whether the last delete failed, and the delete itself
 */
function useDeleteWithUndo({ remove, putBack, onRemoved }: TimelineEventItemProps) {
  const { t } = useAtlasTranslation();
  const { offerUndo } = useUndo();
  const [hasFailed, setHasFailed] = useState(false);
  async function deleteNow() {
    setHasFailed(false);
    // Step 1: delete; on a failure the row stays and says so.
    try {
      await remove();
    } catch {
      setHasFailed(true);
      return;
    }
    // Step 2: the row is gone, so the focus moves on, and the note offers Undo for 8 seconds.
    onRemoved();
    offerUndo({ message: t('storyline.timeline.removed'), undo: putBack });
  }
  return { hasFailed, deleteNow };
}

/**
 * Renders the event.
 *
 * @returns the list item, with its fields while it is being edited
 */
export function TimelineEventItem(props: TimelineEventItemProps) {
  const { t } = useAtlasTranslation();
  const { event, save } = props;
  const [isEditing, setIsEditing] = useState(false);
  const { hasFailed, deleteNow } = useDeleteWithUndo(props);
  // Board E29: More holds Edit and Delete.
  const menuItems = [
    { key: 'edit', label: t('storyline.timeline.edit'), onSelect: () => setIsEditing(true) },
    { key: 'delete', label: t('storyline.timeline.delete'), onSelect: () => void deleteNow() },
  ];
  return (
    <TimelineRow
      kind="event"
      date={event.displayDate}
      sortValue={event.sortValue}
      end={
        <RowMoreMenu
          label={t('storyline.timeline.more', { title: event.title })}
          items={menuItems}
        />
      }
    >
      <p className="m-0 type-label font-semibold break-words text-ink-heading">{event.title}</p>
      {event.description !== '' && !isEditing && (
        <p className="m-0 type-meta break-words whitespace-pre-line text-ink-muted">
          <CrossLinkText text={event.description} />
        </p>
      )}
      {isEditing && <EventFields event={event} save={save} onDone={() => setIsEditing(false)} />}
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('storyline.timeline.deleteFailed')}</Notice>}
      </div>
    </TimelineRow>
  );
}
