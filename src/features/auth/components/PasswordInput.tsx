/**
 * PasswordInput: a password field with a Show / Hide button, board 2.2 (story S1-E2-05).
 *
 * The button shows the typed password as text and back, so people can check it (WCAG 2.2, 3.3.8:
 * no memory test). It is a real button with an accessible name ("Show password") and
 * aria-pressed, 44 px tall, inside the field's pill. Pasting and password managers work.
 * Who uses it: SignInForm and NewPasswordForm.
 */
import { useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** A normal <input>'s attributes plus the label and an error. */
interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  hint?: string;
  errorMessage?: string;
}

/**
 * The ids the field points at with aria-describedby: its hint and its error, when they exist.
 *
 * @param id - the field's id
 * @param hint - the hint, if any
 * @param errorMessage - the error, if any
 * @returns the hint id, the error id and the joined list (undefined when empty)
 */
function describedByIds(id: string, hint?: string, errorMessage?: string) {
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = errorMessage === undefined ? undefined : `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { hintId, errorId, describedBy };
}

/**
 * Renders the label, the field with its button, and the hint and error.
 *
 * @returns the field group
 */
export function PasswordInput({
  id,
  label,
  hint,
  errorMessage,
  className,
  ...inputProps
}: PasswordInputProps) {
  const { t } = useTranslation('auth');
  const [isShown, setIsShown] = useState(false);
  const { hintId, errorId, describedBy } = describedByIds(id, hint, errorMessage);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isShown ? 'text' : 'password'}
          aria-describedby={describedBy}
          aria-invalid={errorMessage === undefined ? undefined : true}
          className={cn(
            'h-12 w-full field-box pr-20 pl-4 font-body text-[15px]',
            errorMessage !== undefined && 'border-destructive',
            className,
          )}
          {...inputProps}
        />
        <button
          type="button"
          aria-pressed={isShown}
          aria-label={isShown ? t('signIn.hidePasswordLabel') : t('signIn.showPasswordLabel')}
          onClick={() => setIsShown(!isShown)}
          className="absolute top-0 right-1 h-11 rounded-full px-3 text-sm font-semibold text-link hover:text-link-hover"
        >
          {isShown ? t('signIn.hidePassword') : t('signIn.showPassword')}
        </button>
      </div>
      {hint !== undefined && (
        <p id={hintId} className="m-0 text-[13px] text-meta">
          {hint}
        </p>
      )}
      {errorMessage !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
