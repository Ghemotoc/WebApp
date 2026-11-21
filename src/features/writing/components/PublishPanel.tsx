/**
 * PublishPanel: the controls inside the editor's "Publish" panel (story S1-E3-03; board 4.3,
 * "Publish", "Scheduled" and "Published" states).
 *
 * Board values: a draft shows "When to publish" (Publish now | Schedule for later; native radio
 * buttons), the Date and Time fields with the local time note when scheduling, Preview and the
 * dark "Publish chapter" / "Schedule chapter" button, and the line about followers. A scheduled
 * chapter shows "Scheduled for …, local time." with "Cancel schedule". A published one shows
 * "Published …" with "Update chapter" (Q10). Under all three: "Unpublish chapter", red, usable
 * only when published, with its note.
 * CALM-6 (the last chapter): "This is the last chapter" (LastChapterSwitch) under the date and
 * time of a draft and under "Scheduled for …"; on the latest published chapter the switch until it
 * is on, then the plain line "This is the last chapter.". A chapter after a marked one says so
 * above the main button, and the main button names the chapter: "Publish chapter 15".
 * Who uses it: EditorAside, given the state and actions by ChapterEditorPage
 * (useChapterPublishing). Problems show under the buttons in a role="alert" line.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { defaultScheduleFields, formatLocalDateTime, localTimeToInstant } from '@/lib/local-time';

import type { ChapterLastState } from '../api/lastChapter';
import type { PublishAction, PublishingState, PublishProblem } from '../hooks/useChapterPublishing';
import { useEditorTranslation } from '../registerEditorTranslations';

import { LastChapterSwitch } from './LastChapterSwitch';

/** What the panel needs. */
export interface PublishPanelProps {
  state: PublishingState;
  /** CALM-6: the last-chapter mark; null while it loads (the switch then waits). */
  lastState: ChapterLastState | null;
  problem: PublishProblem | null;
  isBusy: boolean;
  onAction: (action: PublishAction) => void;
  onPreview: () => void;
}

/** The two native radio buttons: "Publish now" and "Schedule for later". */
function WhenChoice({
  isLater,
  onChange,
}: {
  isLater: boolean;
  onChange: (isLater: boolean) => void;
}) {
  const { t } = useEditorTranslation();
  const options = [
    { value: false, label: t('publish.now') },
    { value: true, label: t('publish.later') },
  ];
  return (
    <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
      <legend className="sr-only">{t('publish.whenLabel')}</legend>
      {options.map((option) => (
        <label
          key={option.label}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink"
        >
          <input
            type="radio"
            name="chapter-publish-when"
            checked={isLater === option.value}
            onChange={() => onChange(option.value)}
            className="m-0 size-5 accent-(--link)"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The main button's words: "Publish chapter 15" once the chapter's number is known (CALM-6).
 *
 * @returns the text
 */
function mainButtonText(
  t: ReturnType<typeof useEditorTranslation>['t'],
  isLater: boolean,
  lastState: ChapterLastState | null,
): string {
  if (lastState === null) return isLater ? t('publish.scheduleButton') : t('publish.publishButton');
  const number = lastState.number;
  return isLater
    ? t('publish.scheduleNumbered', { number })
    : t('publish.publishNumbered', { number });
}

/** A draft: when, the date and time, the last-chapter switch, Preview and the publish button. */
function DraftControls({
  lastState,
  isBusy,
  onAction,
  onPreview,
}: Omit<PublishPanelProps, 'state' | 'problem'>) {
  const { t } = useEditorTranslation();
  const [isLater, setLater] = useState(false);
  const [fields, setFields] = useState(() => defaultScheduleFields(new Date()));
  // CALM-6: off each time the panel opens, except in a later language edition whose original
  // chapter is marked. Null until the writer presses it, so a late answer can still set it.
  const [pickedLast, setPickedLast] = useState<boolean | null>(null);
  const canMark = lastState?.canMark === true;
  const asLast = canMark && (pickedLast ?? lastState.originalIsLast);

  /** Publish now, or schedule the date and time on the writer's own clock (Robert, 20 Nov 2026, 18:19 UTC); a bad date asks again. */
  function submit() {
    if (!isLater) return onAction({ kind: 'publish', asLast });
    const at = localTimeToInstant(fields.date, fields.time);
    onAction({ kind: 'schedule', at: at ?? new Date(0), asLast });
  }

  return (
    <div className="flex flex-col gap-3">
      <WhenChoice isLater={isLater} onChange={setLater} />
      {isLater && (
        <DateTimeField
          id="chapter-publish"
          value={fields}
          onChange={setFields}
          dateLabel={t('publish.date')}
          timeLabel={t('publish.time')}
          note={t('publish.zoneNote')}
          skippedHourNote={(time) => t('publish.skippedHourNote', { time })}
        />
      )}
      {canMark && (
        <LastChapterSwitch
          isOn={asLast}
          onToggle={() => setPickedLast(!asLast)}
          number={lastState.number}
        />
      )}
      {/* CALM-6: a chapter after the marked one takes the mark off when it goes out. */}
      {lastState !== null && lastState.markedNumber !== null && (
        <p className="m-0 text-[13px] leading-normal text-body">
          {t('publish.markedBefore', { number: lastState.markedNumber })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPreview}>
          {t('publish.preview')}
        </Button>
        <Button onClick={submit} disabled={isBusy}>
          {mainButtonText(t, isLater, lastState)}
        </Button>
      </div>
      <p className="m-0 text-[13px] leading-normal text-meta">{t('publish.goLiveNote')}</p>
      {/* Readers are on the web until the apps exist (S1-E4-06a; Q9: "makes copying harder"). */}
      <p className="m-0 text-[13px] leading-normal text-meta">{t('publish.webReadingNote')}</p>
    </div>
  );
}

/** Scheduled: when, the last-chapter switch (a press saves at once), and "Cancel schedule". */
function ScheduledControls({
  state,
  lastState,
  isBusy,
  onAction,
}: Pick<PublishPanelProps, 'state' | 'lastState' | 'isBusy' | 'onAction'>) {
  const { t, i18n } = useEditorTranslation();
  const when =
    state.scheduledFor === null ? '' : formatLocalDateTime(state.scheduledFor, i18n.language);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 rounded-card bg-tint px-3.5 py-3 text-[15px] font-semibold text-heading">
        {t('publish.scheduledFor', { when })}
      </p>
      {lastState !== null && (lastState.isLast || lastState.canMark) && (
        <LastChapterSwitch
          isOn={lastState.isLast}
          onToggle={() => onAction({ kind: 'setLast', isLast: !lastState.isLast })}
          number={lastState.number}
          isDisabled={isBusy}
        />
      )}
      <Button
        variant="secondary"
        onClick={() => onAction({ kind: 'cancelSchedule' })}
        disabled={isBusy}
        className="self-start"
      >
        {t('publish.cancelSchedule')}
      </Button>
    </div>
  );
}

/**
 * The latest published chapter's mark (CALM-6): the switch while it is off, then the plain line.
 * Once on it comes off only by setting the story back to Ongoing in Story settings.
 */
function PublishedLastMark({
  lastState,
  isBusy,
  onAction,
}: Pick<PublishPanelProps, 'lastState' | 'isBusy' | 'onAction'>) {
  const { t } = useEditorTranslation();
  if (lastState === null) return null;
  if (lastState.isLast) {
    return <p className="m-0 text-[15px] font-semibold text-heading">{t('publish.lastMarked')}</p>;
  }
  if (!lastState.canMark) return null;
  return (
    <LastChapterSwitch
      isOn={false}
      onToggle={() => onAction({ kind: 'setLast', isLast: true })}
      number={lastState.number}
      isDisabled={isBusy}
    />
  );
}

/** Published: since when, the last-chapter mark, and "Update chapter" (Q10). */
function PublishedControls({
  state,
  lastState,
  isBusy,
  onAction,
  onPreview,
}: Omit<PublishPanelProps, 'problem'>) {
  const { t, i18n } = useEditorTranslation();
  const when =
    state.lastPublishedAt === null ? '' : formatLocalDateTime(state.lastPublishedAt, i18n.language);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 rounded-card bg-(--success-bg) px-3.5 py-3 text-[15px] font-semibold text-(--success-text)">
        {t('publish.published', { when })}
      </p>
      <PublishedLastMark lastState={lastState} isBusy={isBusy} onAction={onAction} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPreview}>
          {t('publish.preview')}
        </Button>
        <Button onClick={() => onAction({ kind: 'update' })} disabled={isBusy}>
          {t('publish.updateButton')}
        </Button>
      </div>
      <p className="m-0 text-[13px] leading-normal text-meta">{t('publish.updateNote')}</p>
    </div>
  );
}

/** "Unpublish chapter": usable only when published, with the board's note either way. */
function UnpublishControls({
  state,
  isBusy,
  onAction,
}: Pick<PublishPanelProps, 'state' | 'isBusy' | 'onAction'>) {
  const { t } = useEditorTranslation();
  const isPublished = state.status === 'published';
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3.5">
      <Button
        variant="destructive"
        onClick={() => onAction({ kind: 'unpublish' })}
        disabled={!isPublished || isBusy}
      >
        {t('publish.unpublish')}
      </Button>
      <p className="m-0 text-[13px] leading-normal text-meta">
        {isPublished ? t('publish.unpublishNotePublished') : t('publish.unpublishNoteDraft')}
      </p>
    </div>
  );
}

/**
 * Renders the panel's controls for the chapter's state.
 *
 * @returns the controls
 */
export function PublishPanel(props: PublishPanelProps) {
  const { t } = useEditorTranslation();
  return (
    <div className="flex flex-col gap-3.5">
      {props.state.status === 'draft' && (
        <DraftControls
          lastState={props.lastState}
          isBusy={props.isBusy}
          onAction={props.onAction}
          onPreview={props.onPreview}
        />
      )}
      {props.state.status === 'scheduled' && <ScheduledControls {...props} />}
      {props.state.status === 'published' && <PublishedControls {...props} />}
      {props.problem !== null && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(`publish.problems.${props.problem}`)}
        </p>
      )}
      <UnpublishControls {...props} />
    </div>
  );
}
