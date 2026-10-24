/**
 * PublishPanel: the controls inside the editor's "Publish" panel (story S1-E3-03; board 4.3,
 * "Publish", "Scheduled" and "Published" states).
 *
 * Board values: a draft shows "When to publish" (Publish now | Schedule for later; native radio
 * buttons), the Date and Time fields with the Romania time note when scheduling, Preview and the
 * dark "Publish chapter" / "Schedule chapter" button, and the line about followers. A scheduled
 * chapter shows "Scheduled for …, Romania time." with "Cancel schedule". A published one shows
 * "Published …" with "Update chapter" (Q10). Under all three: "Unpublish chapter", red, usable
 * only when published, with its note.
 * Who uses it: EditorAside, given the state and actions by ChapterEditorPage
 * (useChapterPublishing). Problems show under the buttons in a role="alert" line.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import {
  defaultScheduleFields,
  formatRomaniaDateTime,
  romaniaTimeToInstant,
} from '@/lib/romania-time';

import type { PublishAction, PublishingState, PublishProblem } from '../hooks/useChapterPublishing';

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
  const { t } = useTranslation('editor');
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
  const { t } = useTranslation('editor');
  const [isLater, setLater] = useState(false);
  const [fields, setFields] = useState(() => defaultScheduleFields(new Date()));

  /** Publish now, or schedule the Romania date and time (Q7); a bad date asks again. */
  function submit() {
    if (!isLater) return onAction({ kind: 'publish' });
    const at = romaniaTimeToInstant(fields.date, fields.time);
    onAction(at === null ? { kind: 'schedule', at: new Date(0) } : { kind: 'schedule', at });
  }

  return (
    <div className="flex flex-col gap-3">
      <WhenChoice isLater={isLater} onChange={setLater} />
      {isLater && (
        <div className="flex flex-wrap gap-2.5">
          <div className="min-w-[140px] flex-1">
            <TextInput
              id="chapter-publish-date"
              type="date"
              label={t('publish.date')}
              value={fields.date}
              onChange={(event) => setFields({ ...fields, date: event.target.value })}
            />
          </div>
          <div className="min-w-[110px] flex-1">
            <TextInput
              id="chapter-publish-time"
              type="time"
              label={t('publish.time')}
              value={fields.time}
              onChange={(event) => setFields({ ...fields, time: event.target.value })}
            />
          </div>
          <p className="m-0 w-full text-[13px] text-meta">{t('publish.zoneNote')}</p>
        </div>
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
  const { t, i18n } = useTranslation('editor');
  const when =
    state.scheduledFor === null ? '' : formatRomaniaDateTime(state.scheduledFor, i18n.language);
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
  const { t, i18n } = useTranslation('editor');
  const when =
    state.lastPublishedAt === null
      ? ''
      : formatRomaniaDateTime(state.lastPublishedAt, i18n.language);
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
  const { t } = useTranslation('editor');
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
  const { t } = useTranslation('editor');
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
