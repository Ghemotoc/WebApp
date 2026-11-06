/**
 * ReservedNamesSection: the names nobody can take as a username or pen name, and adding or freeing
 * one (stories S1-E11-03 and S1-E2-04; board AdminSettings, "Reserved names").
 *
 * The platform's own names (reason "system") are listed but can't be freed. Who shows it:
 * SettingsPage. What it calls: useNameRules (shared with NameWordsSection).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { MatchRule, ReservedName } from '../api/nameRules';
import type { NameRulesState } from '../hooks/useNameRules';

import { SettingsSection } from './SettingsSection';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The match rules a staff member can pick for a reserved name. */
const nameRules: MatchRule[] = ['whole_name', 'whole_word', 'anywhere'];

/**
 * One reserved name: the name, how it matches, and Free for the ones staff added.
 *
 * @returns the list item
 */
function ReservedNameItem({ name, state }: { name: ReservedName; state: NameRulesState }) {
  const { t } = useTranslation('settings');
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <span className="text-sm text-ink">
        <span className="font-semibold">{name.name}</span>{' '}
        <span className="text-meta">
          · {t(`names.rules.${name.matchRule}`)}
          {name.isSystem && ` · ${t('names.system')}`}
        </span>
      </span>
      {!name.isSystem && (
        <Button
          variant="secondary"
          disabled={state.isChanging}
          onClick={() =>
            void state.change({ kind: 'remove_name', id: name.id }).catch(errorShownByHook)
          }
        >
          {t('names.remove', { name: name.name })}
        </Button>
      )}
    </li>
  );
}

/**
 * The form that reserves a new name.
 *
 * @returns the form
 */
function AddReservedName({ state }: { state: NameRulesState }) {
  const { t } = useTranslation('settings');
  const [name, setName] = useState('');
  const [matchRule, setMatchRule] = useState<MatchRule>('whole_name');

  /** Reserves the typed name and clears the field once it is saved. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === '') return;
    void state
      .change({ kind: 'add_name', name: name.trim(), matchRule })
      .then(() => setName(''))
      .catch(errorShownByHook);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
      aria-label={t('names.addLabel')}
    >
      <div className="min-w-0 flex-1 basis-[200px]">
        <TextInput
          id="reserved-name-new"
          label={t('names.addLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Select
        id="reserved-name-rule"
        label={t('names.matchLabel')}
        isLabelVisible
        value={matchRule}
        onChange={(value) => setMatchRule(value as MatchRule)}
        options={nameRules.map((rule) => ({ value: rule, label: t(`names.rules.${rule}`) }))}
      />
      <Button type="submit" disabled={state.isChanging || name.trim() === ''}>
        {t('names.add')}
      </Button>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @param props.state - the name rules hook's state
 * @returns the names and the add form
 */
export function ReservedNamesSection({ state }: { state: NameRulesState }) {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection id="names" heading={t('sections.names')} intro={t('names.intro')}>
      <AddReservedName state={state} />
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t('names.listLabel')}>
        {state.names.map((name) => (
          <ReservedNameItem key={name.id} name={name} state={state} />
        ))}
      </ul>
    </SettingsSection>
  );
}
