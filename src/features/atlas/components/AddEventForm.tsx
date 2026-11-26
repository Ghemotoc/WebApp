/**
 * AddEventForm: "Add an event" beside the timeline (story S1-E17-20; redrawn by user stories
 * bundle 6, story 6.10, board E29: "Title and Sort value are required … Add event is the one plum
 * button").
 *
 * A section between hairlines, as board E29 draws it: Title, then "Date as it shows" and Sort
 * value side by side, then Description, then the main button. Add event stays pressable; pressed
 * with the title or the sort value missing, it says what is missing beside that field and puts
 * the focus there (design books item 9, useMissingField). A sort value reads "2055,3" too, as
 * Romanian writes it (lib/optionalNumbers.ts). The form empties once the event is saved.
 * Who uses it: TimelineView. What it calls: the onAdd prop (useStoryline's addEvent).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { useMissingField, type MissingField } from '@/lib/forms/useMissingField';

import type { NewStoryEvent } from '../api/storyline';
import { sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The form's four boxes, empty. */
const emptyEvent = { title: '', displayDate: '', sortValue: '', description: '' };

/** The two required boxes' checks. */
interface RequiredChecks {
  title: MissingField;
  sortValue: MissingField;
}

/** The title, date and sort value boxes. */
function EventBoxes({
  typed,
  setTyped,
  required,
}: {
  typed: typeof emptyEvent;
  setTyped: (typed: typeof emptyEvent) => void;
  required: RequiredChecks;
}) {
  const { t } = useAtlasTranslation();
  return (
    <>
      <TextInput
        id="atlas-event-title"
        label={t('storyline.timeline.add.title')}
        placeholder={t('storyline.timeline.add.titlePlaceholder')}
        maxLength={200}
        value={typed.title}
        errorMessage={
          required.title.isShown ? t('storyline.timeline.add.titleRequired') : undefined
        }
        onChange={(changed) => setTyped({ ...typed, title: changed.target.value })}
      />
      {/* Board E29: the two date boxes share one row from 600 px. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="atlas-event-date"
          label={t('storyline.timeline.add.displayDate')}
          hint={t('storyline.timeline.add.displayDateHint')}
          placeholder={t('storyline.timeline.add.displayDatePlaceholder')}
          maxLength={80}
          value={typed.displayDate}
          onChange={(changed) => setTyped({ ...typed, displayDate: changed.target.value })}
        />
        <TextInput
          id="atlas-event-sort"
          label={t('storyline.timeline.add.sortValue')}
          hint={t('storyline.timeline.add.sortValueHint')}
          placeholder={t('storyline.timeline.add.sortValuePlaceholder')}
          inputMode="decimal"
          value={typed.sortValue}
          errorMessage={
            required.sortValue.isShown ? t('storyline.timeline.add.sortRequired') : undefined
          }
          onChange={(changed) => setTyped({ ...typed, sortValue: changed.target.value })}
        />
      </div>
    </>
  );
}

/**
 * Keeps what is typed and checks the two required boxes.
 *
 * @returns the typed boxes, their setter, the checks and the event once both are filled in
 */
function useEventDraft() {
  const [typed, setTyped] = useState(emptyEvent);
  const sortValue = sortValueFrom(typed.sortValue);
  const sortValueNumber = sortValue.isValid ? sortValue.value : null;
  const required: RequiredChecks = {
    title: useMissingField(typed.title.trim() === '', 'atlas-event-title'),
    sortValue: useMissingField(sortValueNumber === null, 'atlas-event-sort'),
  };
  // Both checks run so both messages show; the title's runs last, so the focus lands there.
  function readyEvent(): NewStoryEvent | null {
    const isSortReady = required.sortValue.isReadyToSend();
    const isTitleReady = required.title.isReadyToSend();
    if (!isTitleReady || !isSortReady || sortValueNumber === null) return null;
    return { ...typed, sortValue: sortValueNumber };
  }
  return { typed, setTyped, required, readyEvent };
}

/**
 * Renders the form.
 *
 * @param props.onAdd - adds the event; throws when it can't
 * @returns the section with its four boxes and Add event
 */
export function AddEventForm({ onAdd }: { onAdd: (event: NewStoryEvent) => Promise<void> }) {
  const { t } = useAtlasTranslation();
  const { typed, setTyped, required, readyEvent } = useEventDraft();
  const [hasFailed, setHasFailed] = useState(false);

  /** Adds the event, or says why not. */
  async function add() {
    setHasFailed(false);
    const event = readyEvent();
    if (event === null) return;
    await onAdd(event)
      .then(() => setTyped(emptyEvent))
      .catch(() => setHasFailed(true));
  }

  return (
    <section
      aria-labelledby="atlas-add-event-heading"
      className="flex flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-add-event-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('storyline.timeline.add.heading')}
      </h2>
      <form
        noValidate
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(submitted) => {
          submitted.preventDefault();
          void add();
        }}
      >
        <EventBoxes typed={typed} setTyped={setTyped} required={required} />
        <Textarea
          id="atlas-event-description"
          label={t('storyline.timeline.add.description')}
          rows={2}
          maxLength={5000}
          value={typed.description}
          onChange={(changed) => setTyped({ ...typed, description: changed.target.value })}
        />
        <div aria-live="polite">
          {hasFailed && <Notice tone="error">{t('storyline.timeline.add.failed')}</Notice>}
        </div>
        <Button type="submit" className="self-start">
          {t('storyline.timeline.add.button')}
        </Button>
      </form>
    </section>
  );
}
