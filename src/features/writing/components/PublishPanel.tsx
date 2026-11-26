/**
 * PublishPanel: the controls inside the editor's Publish dialog (story S1-E3-03; board D06, user
 * story 5.6, "Publish chapter").
 *
 * Board D06: under the heading "Chapter 16 · Epilogue: Spring"; a draft then shows "When to
 * publish" as Now | Later (SegmentedControl), the day and time on the writer's own clock when
 * Later (DateTimeField, as the DoD asks, not the board's two selects), "This is the last chapter",
 * "Tell followers" with how many hear (TellFollowersSwitch), what happens to the story when an
 * earlier chapter holds the mark, then the main button ("Publish chapter 16" or "Schedule chapter
 * 16"), Save draft and, under 1024 px where the bar has none, Preview. A draft has nothing to
 * unpublish, so its dialog ends there (the board draws no Unpublish).
 * A scheduled chapter shows "Scheduled for …, local time." with "Cancel schedule"; a published
 * one "Published …" with "Update chapter" (Q10); both keep "Unpublish chapter", red, usable only
 * when published, with its note.
 * CALM-6 (the last chapter): "This is the last chapter" (LastChapterSwitch) on a draft and under
 * "Scheduled for …"; on the latest published chapter the switch until it is on, then the plain
 * line "This is the last chapter.".
 * Who uses it: ChapterEditorPage, in the sheet Publish opens, with the state and actions
 * useChapterPublishing gives. Problems show under the buttons in a role="alert" line.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { defaultScheduleFields, formatLocalDateTime, localTimeToInstant } from '@/lib/local-time';

import type { ChapterLastState } from '../api/lastChapter';
import type { PublishAction, PublishingState, PublishProblem } from '../hooks/useChapterPublishing';
import { useEditorTranslation } from '../registerEditorTranslations';

import { LastChapterSwitch } from './LastChapterSwitch';
import { TellFollowersSwitch } from './TellFollowersSwitch';

/** What the panel needs. */
export interface PublishPanelProps {
  state: PublishingState;
  /** CALM-6: the last-chapter mark; null while it loads (the switch then waits). */
  lastState: ChapterLastState | null;
  /** Board D06: how many followers hear when it goes out; null while it loads. */
  followersToTell: number | null;
  problem: PublishProblem | null;
  isBusy: boolean;
  onAction: (action: PublishAction) => void;
  onPreview: () => void;
  /** Board D06: "Save draft" saves now and closes the dialog. */
  onSaveDraft: () => void;
  /** Manage chapters' "Schedule" item opens the dialog on Later (`?publish=later`, board D03). */
  startsLater?: boolean;
}

/**
 * "When to publish": the words on the left, Now | Later on the right (board D06). The words are
 * the group's name too, so a screen reader hears them once, from the legend.
 */
function WhenChoice({
  isLater,
  onChange,
}: {
  isLater: boolean;
  onChange: (isLater: boolean) => void;
}) {
  const { t } = useEditorTranslation();
  const options = [
    { value: 'now', label: t('publish.now') },
    { value: 'later', label: t('publish.later') },
  ] as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span aria-hidden="true" className="type-label text-ink-heading">
        {t('publish.whenLabel')}
      </span>
      <SegmentedControl
        legend={t('publish.whenLabel')}
        isLegendVisible={false}
        name="chapter-publish-when"
        columns={2}
        options={options}
        value={isLater ? 'later' : 'now'}
        onChange={(value) => onChange(value === 'later')}
      />
    </div>
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

/**
 * CALM-6 and board D06: when an earlier chapter holds the mark, say so and what happens to the
 * story: it stays Completed when this chapter takes the mark, else it goes back to Ongoing.
 */
function MarkedBeforeLines({
  lastState,
  asLast,
}: {
  lastState: ChapterLastState | null;
  asLast: boolean;
}) {
  const { t } = useEditorTranslation();
  if (lastState === null || lastState.markedNumber === null) return null;
  const number = lastState.number;
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 type-meta leading-normal text-ink-muted">
        {t('publish.markedBefore', { number: lastState.markedNumber })}
      </p>
      <p className="m-0 type-meta leading-normal text-ink-muted">
        {asLast ? t('publish.staysCompleted', { number }) : t('publish.backToOngoing', { number })}
      </p>
    </div>
  );
}

/** A draft's choices as the writer makes them: when, the date and time, and the two switches. */
function useDraftChoices(lastState: ChapterLastState | null, startsLater: boolean) {
  const [isLater, setLater] = useState(startsLater);
  const [fields, setFields] = useState(() => defaultScheduleFields(new Date()));
  // CALM-6: off each time the panel opens, except in a later language edition whose original
  // chapter is marked. Null until the writer presses it, so a late answer can still set it.
  const [pickedLast, setPickedLast] = useState<boolean | null>(null);
  // Board D06: followers are told unless the writer switches it off.
  const [tellFollowers, setTellFollowers] = useState(true);
  const canMark = lastState?.canMark === true;
  const asLast = canMark && (pickedLast ?? lastState.originalIsLast);
  return {
    ...{ isLater, setLater, fields, setFields, canMark, asLast, tellFollowers },
    toggleLast: () => setPickedLast(!asLast),
    toggleTell: () => setTellFollowers((current) => !current),
  };
}

/**
 * A draft (board D06): when (Now | Later), the day and time, "This is the last chapter", "Tell
 * followers", the lines about an earlier mark, then the main button, Save draft and (where the
 * bar has no Preview, under 1024 px) Preview.
 */
function DraftControls(props: Omit<PublishPanelProps, 'state' | 'problem'>) {
  const { lastState, isBusy, onAction } = props;
  const { t } = useEditorTranslation();
  const choices = useDraftChoices(lastState, props.startsLater === true);

  /** Publish now, or schedule the date and time on the writer's own clock (Robert, 20 Nov 2026, 18:19 UTC); a bad date asks again. */
  function submit() {
    const { asLast, tellFollowers } = choices;
    if (!choices.isLater) return onAction({ kind: 'publish', asLast, tellFollowers });
    const at = localTimeToInstant(choices.fields.date, choices.fields.time);
    onAction({ kind: 'schedule', at: at ?? new Date(0), asLast, tellFollowers });
  }

  return (
    <div className="flex flex-col gap-4">
      <WhenChoice isLater={choices.isLater} onChange={choices.setLater} />
      {choices.isLater && (
        <DateTimeField
          id="chapter-publish"
          value={choices.fields}
          onChange={choices.setFields}
          dateLabel={t('publish.date')}
          timeLabel={t('publish.time')}
          note={t('publish.zoneNote')}
          skippedHourNote={(time) => t('publish.skippedHourNote', { time })}
        />
      )}
      {/* Board D06: a hairline above each switch row, as the Sheet's rows are split. */}
      {choices.canMark && lastState !== null && (
        <div className="border-t border-border pt-4">
          <LastChapterSwitch
            isOn={choices.asLast}
            onToggle={choices.toggleLast}
            number={lastState.number}
          />
        </div>
      )}
      <div className="border-t border-border pt-4">
        <TellFollowersSwitch
          isOn={choices.tellFollowers}
          onToggle={choices.toggleTell}
          followerCount={props.followersToTell}
        />
      </div>
      <MarkedBeforeLines lastState={lastState} asLast={choices.asLast} />
      <ButtonRow>
        <Button onClick={submit} disabled={isBusy}>
          {mainButtonText(t, choices.isLater, lastState)}
        </Button>
        <Button variant="secondary" onClick={props.onSaveDraft}>
          {t('publish.saveDraft')}
        </Button>
        {/* The bar shows Preview from 1024 px; below that it holds only Publish (board D05). */}
        <Button variant="secondary" onClick={props.onPreview} className="lg:hidden">
          {t('publish.preview')}
        </Button>
      </ButtonRow>
      {/* Readers are on the web until the apps exist (S1-E4-06a; Q9: "makes copying harder"). */}
      <p className="m-0 type-meta leading-normal text-ink-muted">{t('publish.webReadingNote')}</p>
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
      <p className="m-0 rounded-card bg-tint px-4 py-3 type-body font-semibold text-ink-heading">
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
    return (
      <p className="m-0 type-body font-semibold text-ink-heading">{t('publish.lastMarked')}</p>
    );
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
      <p className="m-0 rounded-card bg-(--success-bg) px-4 py-3 type-body font-semibold text-(--success-text)">
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
      <p className="m-0 type-meta leading-normal text-ink-muted">{t('publish.updateNote')}</p>
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
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <Button
        variant="destructive"
        onClick={() => onAction({ kind: 'unpublish' })}
        disabled={!isPublished || isBusy}
      >
        {t('publish.unpublish')}
      </Button>
      <p className="m-0 type-meta leading-normal text-ink-muted">
        {isPublished ? t('publish.unpublishNotePublished') : t('publish.unpublishNoteDraft')}
      </p>
    </div>
  );
}

/**
 * Renders the panel's controls for the chapter's state. A draft has nothing to unpublish, so its
 * dialog ends at the buttons (board D06); scheduled and published chapters keep "Unpublish".
 *
 * @returns the controls
 */
export function PublishPanel(props: PublishPanelProps) {
  const { t } = useEditorTranslation();
  const { state, problem, ...draftProps } = props;
  return (
    <div className="flex flex-col gap-4">
      {state.status === 'draft' && <DraftControls {...draftProps} />}
      {state.status === 'scheduled' && <ScheduledControls {...props} />}
      {state.status === 'published' && <PublishedControls {...props} />}
      {problem !== null && (
        <p role="alert" className="m-0 type-body text-destructive">
          {t(`publish.problems.${problem}`)}
        </p>
      )}
      {state.status !== 'draft' && <UnpublishControls {...props} />}
    </div>
  );
}
