/**
 * AddEventForm: "Add an event" on the timeline (story S1-E17-20: "a title, a display date
 * ('Spring 2055'), a sort value (2055.3) and a description").
 *
 * The title and the sort value are needed; a sort value that isn't a number waits with a plain
 * message (lib/optionalNumbers.ts reads "2055,3" too, as Romanian writes it). The form empties
 * once the event is saved. Who uses it: TimelineView. What it calls: the onAdd prop
 * (useStoryline's addEvent).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { NewStoryEvent } from '../api/storyline';
import { sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The form's four boxes, empty. */
const emptyEvent = { title: '', displayDate: '', sortValue: '', description: '' };

/** Checks the boxes: the event to add, or the message saying what is missing. */
function eventFrom(typed: typeof emptyEvent): NewStoryEvent | 'titleRequired' | 'sortRequired' {
  if (typed.title.trim() === '') return 'titleRequired';
  const sortValue = sortValueFrom(typed.sortValue);
  if (!sortValue.isValid || sortValue.value === null) return 'sortRequired';
  return {
    title: typed.title,
    displayDate: typed.displayDate,
    sortValue: sortValue.value,
    description: typed.description,
  };
}

/** The title, date and sort value boxes. */
function EventBoxes({
  typed,
  setTyped,
}: {
  typed: typeof emptyEvent;
  setTyped: (typed: typeof emptyEvent) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <TextInput
        id="atlas-event-title"
        label={t('storyline.timeline.add.title')}
        maxLength={200}
        value={typed.title}
        onChange={(changed) => setTyped({ ...typed, title: changed.target.value })}
      />
      <TextInput
        id="atlas-event-date"
        label={t('storyline.timeline.add.displayDate')}
        hint={t('storyline.timeline.add.displayDateHint')}
        maxLength={80}
        value={typed.displayDate}
        onChange={(changed) => setTyped({ ...typed, displayDate: changed.target.value })}
      />
      <TextInput
        id="atlas-event-sort"
        label={t('storyline.timeline.add.sortValue')}
        hint={t('storyline.timeline.add.sortValueHint')}
        inputMode="decimal"
        value={typed.sortValue}
        onChange={(changed) => setTyped({ ...typed, sortValue: changed.target.value })}
      />
    </div>
  );
}

/**
 * Renders the form.
 *
 * @param props.onAdd - adds the event; throws when it can't
 * @returns the form with its four boxes and "Add event"
 */
export function AddEventForm({ onAdd }: { onAdd: (event: NewStoryEvent) => Promise<void> }) {
  const { t } = useAtlasTranslation();
  const [typed, setTyped] = useState(emptyEvent);
  const [message, setMessage] = useState<string | null>(null);

  /** Adds the event, or says why not. */
  async function add() {
    setMessage(null);
    const event = eventFrom(typed);
    if (typeof event === 'string') return setMessage(t(`storyline.timeline.add.${event}`));
    await onAdd(event)
      .then(() => setTyped(emptyEvent))
      .catch(() => setMessage(t('storyline.timeline.add.failed')));
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(submitted) => {
        submitted.preventDefault();
        void add();
      }}
    >
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('storyline.timeline.add.heading')}
      </h3>
      <EventBoxes typed={typed} setTyped={setTyped} />
      <Textarea
        id="atlas-event-description"
        label={t('storyline.timeline.add.description')}
        maxLength={5000}
        value={typed.description}
        onChange={(changed) => setTyped({ ...typed, description: changed.target.value })}
      />
      {message !== null && <Notice tone="error">{message}</Notice>}
      <Button type="submit" className="self-start">
        {t('storyline.timeline.add.button')}
      </Button>
    </form>
  );
}
