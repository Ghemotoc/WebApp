/**
 * ValueSettingRow: one named setting with its field and a Save button (story S1-E11-03,
 * criterion 1).
 *
 * The field is text: a number, a word, or a list written with commas. Save reads it back into the
 * same kind of value (lib/settingValue.ts) and the database checks the shape again. Save shows
 * only once the field differs from the saved value, so an unchanged row never sends anything.
 * Who shows it: ValueSettingsSection. What it calls: the change() of useSettingsAdmin.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { SettingRow } from '../api/settingsAdmin';
import type { ShownFailure } from '../hooks/settingsFailure';
import type { SettingsAdminState } from '../hooks/useSettingsAdmin';
import { fieldTextOf, settingKindOf, valueFromField } from '../lib/settingValue';

import { SaveFeedback } from './SaveFeedback';

/** What a row needs. */
interface ValueSettingRowProps {
  setting: SettingRow;
  state: SettingsAdminState;
}

/**
 * The setting's key under its field, for staff who read the database or the docs.
 *
 * @returns the line
 */
function SettingKey({ label, settingKey }: { label: string; settingKey: string }) {
  return (
    <p className="m-0 text-xs text-meta">
      {label} <code className="break-all">{settingKey}</code>
    </p>
  );
}

/**
 * The row's Save button, named after the setting so a screen reader knows which one it saves.
 *
 * @returns the submit button
 */
function RowSaveButton({ name, isDisabled }: { name: string; isDisabled: boolean }) {
  const { t } = useTranslation('settings');
  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={isDisabled}
      aria-label={t('values.saveLabel', { name })}
    >
      {t('values.save')}
    </Button>
  );
}

/**
 * Renders the row, or nothing for an object (those have their own editors).
 *
 * @returns the form
 */
export function ValueSettingRow({ setting, state }: ValueSettingRowProps) {
  const { t } = useTranslation('settings');
  const kind = settingKindOf(setting.value);
  const savedText = fieldTextOf(setting.value);
  const [text, setText] = useState(savedText);
  const [typedFailure, setTypedFailure] = useState<ShownFailure | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  if (kind === null) return null;
  const name = t(`values.names.${setting.key}`, { defaultValue: setting.key });
  const isList = kind === 'list_of_numbers' || kind === 'list_of_words';
  const failure =
    typedFailure ?? (state.failedChange?.key === setting.key ? state.changeFailure : null);
  const setTyped = (typed: string) => {
    setText(typed);
    setIsSaved(false);
  };

  /** Saves the typed value once it reads as the right kind. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (kind === null) return;
    const value = valueFromField(kind, text);
    if (value === null) {
      setTypedFailure({ failure: 'invalid', reason: 'typed_invalid' });
      return;
    }
    setTypedFailure(null);
    void state
      .change({ kind: 'value', key: setting.key, value })
      .then(() => setIsSaved(true))
      .catch(() => setIsSaved(false));
  }

  return (
    <li className="min-w-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2" aria-label={name}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-[180px]">
            <TextInput
              id={`setting-${setting.key}`}
              label={name}
              inputMode={kind === 'number' ? 'decimal' : 'text'}
              value={text}
              hint={isList ? t('values.listHint') : undefined}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
          {text !== savedText && <RowSaveButton name={name} isDisabled={state.isChanging} />}
        </div>
        <SettingKey label={t('values.keyLabel')} settingKey={setting.key} />
        <SaveFeedback isSaved={isSaved} failure={failure} />
      </form>
    </li>
  );
}
