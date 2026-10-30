/**
 * RateLimitsEditor: how many times an hour a new and an older account may do each action, the
 * setting rate_limits (stories S1-E11-03 and S1-E10-12; board AdminSettings, "Rate limits").
 *
 * The actions come from the setting itself, so a later story's new action shows here without a
 * change to this file. Save sends the whole setting; the database refuses a missing part or a
 * number below zero. Who shows it: SettingsPage. What it calls: the change() of useSettingsAdmin.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { SettingsAdminState } from '../hooks/useSettingsAdmin';

import { SaveFeedback } from './SaveFeedback';
import { SettingsSection } from './SettingsSection';

/** Per action, the hourly limit for a new account and for an older one, as typed. */
type Limits = Record<string, { new_account: string; older_account: string }>;

/** The two kinds of account a limit applies to. */
const tiers = ['new_account', 'older_account'] as const;

/**
 * The saved setting as typed text, one entry per action.
 *
 * @param state - the settings hook's state
 * @returns the limits
 */
function limitsFrom(state: SettingsAdminState): Limits {
  const value = state.settings.find((setting) => setting.key === 'rate_limits')?.value;
  const limits: Limits = {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return limits;
  for (const [action, tierValues] of Object.entries(value)) {
    const tierObject = (tierValues ?? {}) as Record<string, unknown>;
    limits[action] = {
      new_account: String(tierObject.new_account ?? ''),
      older_account: String(tierObject.older_account ?? ''),
    };
  }
  return limits;
}

/**
 * The typed limits as the setting's value; a field that isn't a whole number stays text, so the
 * database refuses it with a reason.
 *
 * @param limits - the typed limits
 * @returns the value to save
 */
function valueFrom(limits: Limits) {
  const toNumber = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : text);
  return Object.fromEntries(
    Object.entries(limits).map(([action, typed]) => [
      action,
      { new_account: toNumber(typed.new_account), older_account: toNumber(typed.older_account) },
    ]),
  );
}

/** What one action's fields need. */
interface ActionLimitsProps {
  action: string;
  typed: Limits[string];
  onType: (tier: (typeof tiers)[number], text: string) => void;
}

/**
 * One action: its name and the two hourly limits.
 *
 * @returns the list item
 */
function ActionLimits({ action, typed, onType }: ActionLimitsProps) {
  const { t } = useTranslation('settings');
  return (
    <li className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div role="group" aria-labelledby={`limit-${action}`} className="flex flex-col gap-2">
        <h3 id={`limit-${action}`} className="m-0 text-sm font-bold text-heading">
          {t(`rateLimits.actions.${action}`, { defaultValue: action })}
        </h3>
        <div className="flex flex-wrap gap-3">
          {tiers.map((tier) => (
            <div key={tier} className="w-[200px] max-w-full">
              <TextInput
                id={`limit-${action}-${tier}`}
                inputMode="numeric"
                label={t(
                  tier === 'new_account' ? 'rateLimits.newAccount' : 'rateLimits.olderAccount',
                )}
                value={typed[tier]}
                onChange={(event) => onType(tier, event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * Renders the editor.
 *
 * @param props.state - the settings hook's state
 * @returns the section
 */
export function RateLimitsEditor({ state }: { state: SettingsAdminState }) {
  const { t } = useTranslation('settings');
  const [limits, setLimits] = useState<Limits>(() => limitsFrom(state));
  const [isSaved, setIsSaved] = useState(false);
  const failure = state.failedChange?.key === 'rate_limits' ? state.changeFailure : null;
  const setLimit = (action: string, tier: (typeof tiers)[number], text: string) => {
    setLimits((current) => {
      const typed = current[action] ?? { new_account: '', older_account: '' };
      return { ...current, [action]: { ...typed, [tier]: text } };
    });
    setIsSaved(false);
  };
  const save = () =>
    void state
      .change({ kind: 'value', key: 'rate_limits', value: valueFrom(limits) })
      .then(() => setIsSaved(true))
      .catch(() => setIsSaved(false));
  return (
    <SettingsSection
      id="rate-limits"
      heading={t('sections.rateLimits')}
      intro={t('rateLimits.intro')}
    >
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {Object.entries(limits).map(([action, typed]) => (
          <ActionLimits
            key={action}
            action={action}
            typed={typed}
            onType={(tier, text) => setLimit(action, tier, text)}
          />
        ))}
      </ul>
      <SaveFeedback isSaved={isSaved} failure={failure} />
      <div>
        <Button disabled={state.isChanging} onClick={save}>
          {t('rateLimits.save')}
        </Button>
      </div>
    </SettingsSection>
  );
}
