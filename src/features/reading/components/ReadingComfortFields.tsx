/**
 * ReadingComfortFields: the reading settings panel's "Night by the clock" and "Reading ruler"
 * (bundle IDEAS-1, part a; ideas IDEA-20261031-7 and 8).
 *
 * Night by the clock: a checkbox and, once ticked, two time fields the reader fills in
 * themselves. There is no preset hour (Robert, 31 Oct 2026), so the fields start empty and the
 * line under them says nothing changes until both are set. A span past midnight is fine.
 * Reading ruler: one checkbox; the band appears on the chapter at once.
 * Both save with the rest of the panel, to the reader's account.
 * Who uses it: ReadingSettingsPanel. What it calls: the panel's change(), nothing else.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

import type { ReadingSettings } from '../api/readingSettings';

/** What the fields need. */
interface ReadingComfortFieldsProps {
  settings: ReadingSettings;
  change: (changes: Partial<ReadingSettings>) => void;
}

/** One checkbox with its label and hint, the style the settings use elsewhere. */
function ComfortCheckbox(props: {
  id: string;
  label: string;
  hint: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id={props.id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0"
        checked={props.isChecked}
        aria-describedby={`${props.id}-hint`}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={props.id} className="text-[15px] font-semibold text-heading">
          {props.label}
        </label>
        <span id={`${props.id}-hint`} className="text-[13px] leading-normal text-meta">
          {props.hint}
        </span>
      </div>
    </div>
  );
}

/** The two times, shown while Night by the clock is ticked. */
function NightHours({ settings, change }: ReadingComfortFieldsProps) {
  const { t } = useTranslation('reading');
  const isWaiting = settings.nightFrom === null || settings.nightUntil === null;
  return (
    <div className="flex flex-col gap-2 pl-8">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[160px] flex-1">
          <TextInput
            id="reading-night-from"
            type="time"
            label={t('settings.nightFrom')}
            value={settings.nightFrom ?? ''}
            onChange={(event) => change({ nightFrom: event.target.value || null })}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <TextInput
            id="reading-night-until"
            type="time"
            label={t('settings.nightUntil')}
            value={settings.nightUntil ?? ''}
            onChange={(event) => change({ nightUntil: event.target.value || null })}
          />
        </div>
      </div>
      <p className="m-0 text-[13px] leading-normal text-meta" aria-live="polite">
        {isWaiting ? t('settings.nightWaiting') : t('settings.nightNextChapter')}
      </p>
    </div>
  );
}

/**
 * Renders the two settings.
 *
 * @returns the fields
 */
export function ReadingComfortFields({ settings, change }: ReadingComfortFieldsProps) {
  const { t } = useTranslation('reading');
  return (
    <>
      <div className="flex flex-col gap-3">
        <ComfortCheckbox
          id="reading-night-by-clock"
          label={t('settings.nightByClock')}
          hint={t('settings.nightByClockHint')}
          isChecked={settings.nightByClock}
          onChange={(isChecked) => change({ nightByClock: isChecked })}
        />
        {settings.nightByClock && <NightHours settings={settings} change={change} />}
      </div>
      <ComfortCheckbox
        id="reading-ruler"
        label={t('settings.ruler')}
        hint={t('settings.rulerHint')}
        isChecked={settings.readingRuler}
        onChange={(isChecked) => change({ readingRuler: isChecked })}
      />
    </>
  );
}
