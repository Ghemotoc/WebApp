/**
 * ConfirmLogIn: "Log in again to confirm" on the Delete account panel (story S1-E13-03; board
 * Settings 6.3, the second Delete account panel).
 *
 * It offers only the ways the person can use: each connected provider (Google, Apple,
 * Microsoft, with their own logos), "Use a passkey" when they have one, and their password when
 * the account has one. A log-in from the last few minutes is what lets "Delete account" work
 * (request_account_deletion() checks it again), so nobody can delete an account on a device left
 * signed in.
 * Who shows it: DeleteAccountConfirm, while the last log-in is too old. What it calls:
 * useLoginMethods (features/account) and useConfirmLogIn.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { useLoginMethods } from '@/features/account/hooks/useLoginMethods';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { SocialButtons } from '@/features/auth/components/SocialButtons';

import { useConfirmLogIn, type ConfirmOutcome } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

/** The outcomes that leave a message under the ways to log in. */
type FailureOutcome = Exclude<ConfirmOutcome, 'confirmed' | 'leaving'>;

/**
 * Says whether an outcome needs a message.
 *
 * @param outcome - the last outcome, if any
 * @returns true for a failure
 */
function isFailure(outcome: ConfirmOutcome | undefined): outcome is FailureOutcome {
  return outcome !== undefined && outcome !== 'confirmed' && outcome !== 'leaving';
}

/**
 * The password form: the account's own email is used, so only the password is asked for.
 *
 * @param props.isBusy - true while a log-in is on its way
 * @param props.onSubmit - called with the password typed
 * @returns the form
 */
function PasswordForm({
  isBusy,
  onSubmit,
}: {
  isBusy: boolean;
  onSubmit: (password: string) => void;
}) {
  const { t } = useAccountDeletionTranslation();
  const [password, setPassword] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password !== '') onSubmit(password);
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <PasswordInput
        id="delete-account-password"
        label={t('confirm.passwordLabel')}
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" variant="secondary" className="w-fit" disabled={isBusy}>
        {t('confirm.passwordButton')}
      </Button>
    </form>
  );
}

/**
 * Renders the ways to log in again.
 *
 * @returns the block
 */
export function ConfirmLogIn() {
  const { t } = useAccountDeletionTranslation();
  const { methods } = useLoginMethods();
  const confirm = useConfirmLogIn();
  if (methods === null) return null;
  const isBusy = confirm.isPending;
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{t('confirm.logInAgainLabel')}</Eyebrow>
      <p className="m-0 text-sm text-meta">{t('confirm.logInAgainHint')}</p>
      {methods.providers.length > 0 && (
        <SocialButtons
          groupLabel={t('confirm.otherWays')}
          providers={methods.providers}
          isBusy={isBusy}
          onChoose={(provider) => confirm.mutate({ way: 'provider', provider })}
        />
      )}
      {methods.passkeys.length > 0 && (
        <Button
          variant="secondary"
          className="w-fit"
          disabled={isBusy}
          onClick={() => confirm.mutate({ way: 'passkey' })}
        >
          {t('confirm.passkey')}
        </Button>
      )}
      {methods.hasPassword && (
        <PasswordForm
          isBusy={isBusy}
          onSubmit={(password) => confirm.mutate({ way: 'password', password })}
        />
      )}
      {(confirm.isError || isFailure(confirm.data)) && (
        <Notice tone="error">
          {t(`confirm.failures.${isFailure(confirm.data) ? confirm.data : 'failed'}`)}
        </Notice>
      )}
    </div>
  );
}
