/**
 * LogsFailureNote: what a Staff › Logs view says when it can't be read (bundle LOGS-1, part d).
 * Who shows it: CallsView, FailuresView and CrashesView.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { AppLogsFailure } from '../../api/appLogs';

/**
 * Renders the note.
 *
 * @param props.failure - why the read failed
 * @returns a plain line for someone who may not look, an error notice otherwise
 */
export function LogsFailureNote({ failure }: { failure: AppLogsFailure }) {
  const { t } = useTranslation('staff');
  if (failure === 'not_allowed') return <p className="m-0 text-body">{t('logs.notAllowed')}</p>;
  return <Notice tone="error">{t(`logs.failures.${failure}`)}</Notice>;
}
