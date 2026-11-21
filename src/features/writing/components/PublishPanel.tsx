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
 * Who uses it: EditorAside, given the state and actions by ChapterEditorPage
 * (useChapterPublishing). Problems show under the buttons in a role="alert" line.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { defaultScheduleFields, formatLocalDateTime, localTimeToInstant } from '@/lib/local-time';

import type { PublishAction, PublishingState, PublishProblem } from '../hooks/useChapterPublishing';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the panel needs. */
export interface PublishPanelProps {
  state: PublishingState;
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

/** A draft: when, the date and time, Preview and the publish button. */
function DraftControls({
  isBusy,
  onAction,
  onPreview,
}: Omit<PublishPanelProps, 'state' | 'problem'>) {
  const { t } = useEditorTranslation();
  const [isLater, setLater] = useState(false);
  const [fields, setFields] = useState(() => defaultScheduleFields(new Date()));

  /** Publish now, or schedule the date and time on the writer's own clock (Robert, 20 Nov 2026, 18:19 UTC); a bad date asks again. */
  function submit() {
    if (!isLater) return onAction({ kind: 'publish' });
    const at = localTimeToInstant(fields.date, fields.time);
    onAction(at === null ? { kind: 'schedule', at: new Date(0) } : { kind: 'schedule', at });
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
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPreview}>
          {t('publish.preview')}
        </Button>
        <Button onClick={submit} disabled={isBusy}>
          {isLater ? t('publish.scheduleButton') : t('publish.publishButton')}
        </Button>
      </div>
      <p className="m-0 text-[13px] leading-normal text-meta">{t('publish.goLiveNote')}</p>
      {/* Readers are on the web until the apps exist (S1-E4-06a; Q9: "makes copying harder"). */}
      <p className="m-0 text-[13px] leading-normal text-meta">{t('publish.webReadingNote')}</p>
    </div>
  );
}

/** Scheduled: when, and "Cancel schedule". */
function ScheduledControls({
  state,
  isBusy,
  onAction,
}: Pick<PublishPanelProps, 'state' | 'isBusy' | 'onAction'>) {
  const { t, i18n } = useEditorTranslation();
  const when =
    state.scheduledFor === null ? '' : formatLocalDateTime(state.scheduledFor, i18n.language);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 rounded-card bg-tint px-3.5 py-3 text-[15px] font-semibold text-heading">
        {t('publish.scheduledFor', { when })}
      </p>
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

/** Published: since when, and "Update chapter" (Q10). */
function PublishedControls({
  state,
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
