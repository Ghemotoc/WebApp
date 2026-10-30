/**
 * SaveFeedback: what follows a Save on Staff › Settings: "Saved" as a status message, or why it
 * failed (story S1-E11-03).
 *
 * Who uses it: ValueSettingRow, DiscoverMixEditor and RateLimitsEditor.
 */
import { useTranslation } from 'react-i18next';

import type { ShownFailure } from '../hooks/settingsFailure';

import { SettingsFailureNotice } from './SettingsFailureNotice';

/**
 * Renders the message, or nothing.
 *
 * @param props.isSaved - whether the last save worked
 * @param props.failure - why it failed, or null
 * @returns the status line or the error notice
 */
export function SaveFeedback({
  isSaved,
  failure,
}: {
  isSaved: boolean;
  failure: ShownFailure | null;
}) {
  const { t } = useTranslation('settings');
  if (failure !== null) return <SettingsFailureNotice failure={failure} />;
  if (!isSaved) return null;
  return (
    <p className="m-0 text-sm text-body" role="status">
      {t('saved')}
    </p>
  );
}
