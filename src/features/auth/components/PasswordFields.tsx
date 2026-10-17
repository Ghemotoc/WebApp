/**
 * PasswordFields: "Password" and "Confirm password", or the emailed-link choice instead, board 2.1
 * (story S1-E2-01).
 *
 * Rules: at least 10 characters, pasting allowed (no blocking of paste or of password managers:
 * WCAG 2.2, 3.3.8), checked against leaked passwords on submit. As soon as the second field has
 * something in it, a line under it says whether the two match, so the person knows before they
 * press "Create account" (Robert, canvas comment, 16 Oct 2026); the line is read out politely.
 * "Email me a log-in link instead" swaps both fields for a short note.
 * Who uses it: SignUpForm.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import type { SignUpMethod } from '@/schemas/signUp';

/** What the fields need from the form. */
interface PasswordFieldsProps {
  method: SignUpMethod;
  password: string;
  confirmPassword: string;
  passwordProblem?: string;
  confirmProblem?: string;
  onMethodChange: (method: SignUpMethod) => void;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}

/**
 * The live line under "Confirm password".
 *
 * @returns "The passwords match." with a tick, or "don't match yet", or nothing while empty
 */
function MatchLine({
  password,
  confirmPassword,
}: Pick<PasswordFieldsProps, 'password' | 'confirmPassword'>) {
  const { t } = useTranslation('auth');
  const isMatch = confirmPassword !== '' && confirmPassword === password;
  return (
    <p
      aria-live="polite"
      className={`m-0 flex min-h-5 items-center gap-1.5 pl-5 text-[13px] font-semibold ${isMatch ? 'text-(--success-text)' : 'text-meta'}`}
    >
      {isMatch && <CheckIcon />}
      {confirmPassword !== '' &&
        (isMatch ? t('signUp.confirmPassword.match') : t('signUp.confirmPassword.differ'))}
    </p>
  );
}

/**
 * Renders the password fields, or the link note.
 *
 * @returns the fields and the switch between a password and an emailed link
 */
export function PasswordFields(props: PasswordFieldsProps) {
  const { t } = useTranslation('auth');
  if (props.method === 'link') {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm text-body">{t('signUp.linkNote')}</p>
        <Button
          variant="text"
          className="self-start"
          onClick={() => props.onMethodChange('password')}
        >
          {t('signUp.usePassword')}
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <TextInput
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          label={t('signUp.password.label')}
          hint={t('signUp.password.hint')}
          errorMessage={props.passwordProblem === undefined ? undefined : t(props.passwordProblem)}
          value={props.password}
          onChange={(event) => props.onPasswordChange(event.target.value)}
        />
        <Button variant="text" className="self-start" onClick={() => props.onMethodChange('link')}>
          {t('signUp.useLink')}
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <TextInput
          id="sign-up-confirm-password"
          type="password"
          autoComplete="new-password"
          label={t('signUp.confirmPassword.label')}
          errorMessage={props.confirmProblem === undefined ? undefined : t(props.confirmProblem)}
          value={props.confirmPassword}
          onChange={(event) => props.onConfirmChange(event.target.value)}
        />
        <MatchLine password={props.password} confirmPassword={props.confirmPassword} />
      </div>
    </>
  );
}
