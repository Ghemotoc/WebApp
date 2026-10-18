/**
 * SendProblem: why a reset link wasn't sent, if it wasn't (story S1-E2-05).
 *
 * Who shows it: ForgotPasswordPage, under the form and under "Send the link again".
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { SendState } from '../hooks/useResetRequest';

/** The words for each problem. */
const problemKeys: Partial<Record<SendState, string>> = {
  email_missing: 'signIn.emailMissing',
  too_many_attempts: 'signIn.tooManyAttempts',
  unreachable: 'signIn.unreachable',
};

/**
 * Renders the problem, or nothing.
 *
 * @param props.state - the last send's state
 * @returns the message box
 */
export function SendProblem({ state }: { state: SendState }) {
  const { t } = useTranslation('auth');
  const key = problemKeys[state];
  return key === undefined ? null : <Notice tone="error">{t(key)}</Notice>;
}
