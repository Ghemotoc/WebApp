/**
 * FlagsSection: every feature flag with an on and off switch (story S1-E11-03, criterion 1).
 *
 * A switch saves at once; the database logs it with the before and after state. The section says
 * the new state out loud (a polite live region), so a screen reader hears that the change worked.
 * Who shows it: SettingsPage. What it calls: the change() of useSettingsAdmin.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FeatureFlagRow } from '../api/settingsAdmin';
import type { SettingsAdminState } from '../hooks/useSettingsAdmin';

import { SettingsFailureNotice } from './SettingsFailureNotice';
import { SettingsSection } from './SettingsSection';
import { SwitchButton } from './SwitchButton';

/** What one flag row needs. */
interface FlagRowProps {
  flag: FeatureFlagRow;
  isChanging: boolean;
  onToggle: (flag: FeatureFlagRow, name: string) => void;
}

/**
 * One flag: its name, what it does, its key and the switch.
 *
 * @returns the list item
 */
function FlagRow({ flag, isChanging, onToggle }: FlagRowProps) {
  const { t } = useTranslation('settings');
  // A flag the locale files don't describe yet shows its key and the database's note.
  const name = t(`flags.names.${flag.key}.label`, { defaultValue: flag.key });
  const description = t(`flags.names.${flag.key}.description`, { defaultValue: flag.description });
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-base font-bold text-heading">{name}</h3>
        <p className="m-0 text-sm text-body">{description}</p>
        <p className="m-0 text-xs text-meta">
          {t('flags.keyLabel')} <code className="break-all">{flag.key}</code>
        </p>
      </div>
      <SwitchButton
        label={name}
        isOn={flag.isEnabled}
        stateWord={flag.isEnabled ? t('flags.on') : t('flags.off')}
        isDisabled={isChanging}
        onToggle={() => onToggle(flag, name)}
      />
    </li>
  );
}

/**
 * Renders the flags.
 *
 * @param props.state - the settings hook's state
 * @returns the section
 */
export function FlagsSection({ state }: { state: SettingsAdminState }) {
  const { t } = useTranslation('settings');
  const [announcement, setAnnouncement] = useState('');
  const failure = state.failedChange?.kind === 'flag' ? state.changeFailure : null;

  /** Switches a flag and announces its new state once saved. */
  function toggle(flag: FeatureFlagRow, name: string) {
    const turnOn = !flag.isEnabled;
    void state
      .change({ kind: 'flag', key: flag.key, turnOn })
      .then(() => setAnnouncement(t(turnOn ? 'flags.nowOn' : 'flags.nowOff', { name })))
      .catch(() => setAnnouncement(''));
  }

  return (
    <SettingsSection id="flags" heading={t('sections.flags')} intro={t('flags.intro')}>
      <SettingsFailureNotice failure={failure} />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {state.flags.map((flag) => (
          <FlagRow key={flag.key} flag={flag} isChanging={state.isChanging} onToggle={toggle} />
        ))}
      </ul>
    </SettingsSection>
  );
}
