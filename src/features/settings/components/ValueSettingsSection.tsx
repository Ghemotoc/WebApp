/**
 * ValueSettingsSection: the named settings in groups (Content, Ranking, Spam and abuse, and so on),
 * each with its own field (story S1-E11-03, criterion 1).
 *
 * The groups come from lib/settingGroups.ts; a setting no group lists shows under "Other", so a
 * new one is never hidden. Who shows it: SettingsPage. What it calls: ValueSettingRow.
 */
import { useTranslation } from 'react-i18next';

import type { SettingRow } from '../api/settingsAdmin';
import type { SettingsAdminState } from '../hooks/useSettingsAdmin';
import { settingGroups, ungroupedKeys } from '../lib/settingGroups';

import { SettingsSection } from './SettingsSection';
import { ValueSettingRow } from './ValueSettingRow';

/**
 * One group: a heading and its settings, in the group's order.
 *
 * @returns the group, or nothing when none of its settings exist
 */
function SettingGroup(props: { id: string; keys: string[]; state: SettingsAdminState }) {
  const { t } = useTranslation('settings');
  const byKey = new Map(props.state.settings.map((setting) => [setting.key, setting]));
  const settings = props.keys
    .map((key) => byKey.get(key))
    .filter((setting): setting is SettingRow => setting !== undefined);
  if (settings.length === 0) return null;
  const headingId = `values-${props.id}`;
  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={headingId}>
      <h3 id={headingId} className="m-0 text-base font-bold text-heading">
        {t(`values.groups.${props.id}`)}
      </h3>
      <ul className="m-0 grid list-none gap-x-6 gap-y-4 p-0 md:grid-cols-2 xl:grid-cols-3">
        {settings.map((setting) => (
          <ValueSettingRow key={setting.key} setting={setting} state={props.state} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders every group.
 *
 * @param props.state - the settings hook's state
 * @returns the section
 */
export function ValueSettingsSection({ state }: { state: SettingsAdminState }) {
  const { t } = useTranslation('settings');
  const otherKeys = ungroupedKeys(state.settings.map((setting) => setting.key));
  return (
    <SettingsSection id="values" heading={t('sections.values')} intro={t('values.intro')}>
      {settingGroups.map((group) => (
        <SettingGroup key={group.id} id={group.id} keys={group.keys} state={state} />
      ))}
      <SettingGroup id="other" keys={otherKeys} state={state} />
    </SettingsSection>
  );
}
