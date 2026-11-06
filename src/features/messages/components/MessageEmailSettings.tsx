/**
 * MessageEmailSettings: "Emails about messages" in Settings › Messages: whether a new private
 * message is emailed, and quiet hours when such emails wait until morning (bundle IDEAS-2, part
 * c1; idea IDEA-20261101-6).
 *
 * Two ticks and two times, saved with one button because a time is typed in steps. The email
 * names who wrote, never the words, and goes no sooner than 5 minutes after the message, so
 * someone chatting in the app gets none. Under 18, quiet hours are on from 21:00 to 07:00 and
 * stay on: the person can move them but not end them before 07:00 or start them after 22:00
 * (Q50); the tick is shown ticked and can't be changed, with a line saying why. Times are
 * Romanian time (the database's rule).
 * Who shows it: MessageSettingsSection. What it calls: useSaveMessageEmails.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { MessageEmailChoices } from '../api/messageEmails';
import { useSaveMessageEmails } from '../hooks/useMessageSettings';
import { useMessagesTranslation } from '../registerMessagesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs: the saved choices. */
interface MessageEmailSettingsProps {
  choices: MessageEmailChoices;
}

/** The two times, shown while quiet hours are on. */
function QuietHourFields({
  draft,
  change,
}: {
  draft: MessageEmailChoices;
  change: (part: Partial<MessageEmailChoices>) => void;
}) {
  const { t } = useMessagesTranslation();
  return (
    <div className="flex flex-wrap gap-3 pl-8">
      <div className="min-w-[160px] flex-1">
        <TextInput
          id="message-quiet-from"
          type="time"
          required
          label={t('emails.quietFrom')}
          value={draft.quietFrom}
          onChange={(event) => change({ quietFrom: event.target.value })}
        />
      </div>
      <div className="min-w-[160px] flex-1">
        <TextInput
          id="message-quiet-until"
          type="time"
          required
          label={t('emails.quietUntil')}
          value={draft.quietUntil}
          onChange={(event) => change({ quietUntil: event.target.value })}
        />
      </div>
    </div>
  );
}

/** One tick box with its label. */
function Tick({
  id,
  label,
  checked,
  disabled = false,
  describedBy,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  describedBy?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-6 cursor-pointer items-center gap-3 text-[15px] text-body"
    >
      <input
        id={id}
        type="checkbox"
        className="size-6 shrink-0 cursor-pointer accent-(--link)"
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function MessageEmailSettings({ choices }: MessageEmailSettingsProps) {
  const { t } = useMessagesTranslation();
  const saving = useSaveMessageEmails();
  const [draft, setDraft] = useState(choices);
  const [isChanged, setIsChanged] = useState(false);

  /** Step 1: a change to the draft; the saved line goes until the next save. */
  function change(part: Partial<MessageEmailChoices>) {
    setDraft((current) => ({ ...current, ...part }));
    setIsChanged(true);
  }

  /** Step 2: saves the draft; the database refuses hours that don't fit (shown below). */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // An under-18's quiet hours are always sent as on; the database insists anyway (Q50).
    await saving
      .save({ ...draft, quietHoursOn: draft.mustKeepQuietHours || draft.quietHoursOn })
      .then(() => setIsChanged(false))
      .catch(errorShownByHook);
  }

  const showsHours = draft.mustKeepQuietHours || draft.quietHoursOn;
  return (
    <form
      aria-labelledby="message-emails-heading"
      className="flex flex-col gap-3 border-t border-border pt-4"
      onSubmit={(event) => void submit(event)}
    >
      <h3 id="message-emails-heading" className="m-0 text-[17px] font-semibold text-heading">
        {t('emails.heading')}
      </h3>
      <p className="m-0 text-[15px] text-body">{t('emails.intro')}</p>
      <Tick
        id="message-emails-on"
        label={t('emails.emailsLabel')}
        checked={draft.emailsOn}
        onChange={(checked) => change({ emailsOn: checked })}
      />
      <Tick
        id="message-quiet-hours-on"
        label={t('emails.quietLabel')}
        checked={showsHours}
        disabled={draft.mustKeepQuietHours}
        describedBy="message-quiet-hint"
        onChange={(checked) => change({ quietHoursOn: checked })}
      />
      <p id="message-quiet-hint" className="m-0 text-[13px] text-meta">
        {draft.mustKeepQuietHours ? t('emails.under18Hint') : t('emails.quietHint')}
      </p>
      {showsHours && <QuietHourFields draft={draft} change={change} />}
      <Button type="submit" variant="secondary" className="w-fit" disabled={saving.isSaving}>
        {t('emails.save')}
      </Button>
      <SaveOutcome
        hasFailed={saving.hasFailed}
        isSaved={saving.isSaved && !isChanged}
        mustKeepQuietHours={draft.mustKeepQuietHours}
      />
    </form>
  );
}

/** The line under Save: refused (in an under-18's own words when the hours were the reason) or saved. */
function SaveOutcome({
  hasFailed,
  isSaved,
  mustKeepQuietHours,
}: {
  hasFailed: boolean;
  isSaved: boolean;
  mustKeepQuietHours: boolean;
}) {
  const { t } = useMessagesTranslation();
  return (
    <div aria-live="polite">
      {hasFailed && (
        <Notice tone="error">
          {mustKeepQuietHours ? t('emails.under18Refused') : t('emails.saveFailed')}
        </Notice>
      )}
      {isSaved && (
        <p role="status" className="m-0 text-[15px] text-body">
          {t('emails.saved')}
        </p>
      )}
    </div>
  );
}
