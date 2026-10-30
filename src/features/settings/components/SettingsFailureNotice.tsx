/**
 * SettingsFailureNotice: says why a settings change or read failed, in plain words, with the
 * database's reason when it gave one (story S1-E11-03).
 *
 * Who uses it: every section of SettingsPage.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { ShownFailure } from '../hooks/settingsFailure';

/**
 * Renders the message, or nothing when there is no failure.
 *
 * @param props.failure - what went wrong, or null
 * @returns the error notice
 */
export function SettingsFailureNotice({ failure }: { failure: ShownFailure | null }) {
  const { t } = useTranslation('settings');
  if (failure === null) return null;
  // A known reason word says exactly what to fix; otherwise the general failure is enough.
  const reasonKey = `reasons.${failure.reason ?? ''}`;
  const hasReason = failure.reason !== null && reasonKey !== t(reasonKey);
  return (
    <Notice tone="error">{hasReason ? t(reasonKey) : t(`failures.${failure.failure}`)}</Notice>
  );
}
