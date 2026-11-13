/**
 * PasswordStrengthMeter: one thin bar and one line under a new password (PASSWORD-1; Robert,
 * 12 Nov 2026: one line instead of a checklist. It replaces the four segments of bundle G3).
 *
 * The bar fills in four steps and changes colour: red weak, yellow fair, green strong, dark green
 * very strong (handoff "Fields and forms"). The line says the step in words, and a tick joins it
 * once the password is strong, so the meter never rests on colour alone (WCAG 1.4.1). While the
 * password is shorter than the rule allows, the line also says what is missing. Screen readers
 * hear the line politely as the person types. It is a hint only: the rules are the field's own
 * checks (schemas/signUp.ts).
 * Who shows it: PasswordFields (sign-up) and NewPasswordForm (a new password after a reset).
 * What it calls: lib/passwordStrength.ts.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { minimumPasswordLength } from '@/schemas/signUp';

import {
  passwordStrength,
  passwordStrengths,
  type PasswordStrength,
} from '../lib/passwordStrength';

/** Each step's colour token. */
const stepColour: Record<PasswordStrength, string> = {
  weak: 'var(--strength-weak)',
  fair: 'var(--strength-fair)',
  strong: 'var(--strength-strong)',
  'very-strong': 'var(--strength-very-strong)',
};

/** The steps that earn the tick. */
const stepsWithTick = new Set<PasswordStrength>(['strong', 'very-strong']);

/**
 * Renders the meter, or nothing while the field is empty.
 *
 * @param password - the password as typed
 * @param id - an id for the line, so tests and styles can find it
 * @returns the bar and the line
 */
export function PasswordStrengthMeter({ password, id }: { password: string; id: string }) {
  const { t } = useTranslation('auth');
  // Step 1: nothing typed yet, so the field's own hint shows instead.
  const strength = passwordStrength(password);
  if (strength === null) return null;
  // Step 2: how much of the bar to fill, a quarter for each step.
  const filledSteps = passwordStrengths.indexOf(strength) + 1;
  const filledPercent = (filledSteps / passwordStrengths.length) * 100;
  // Step 3: a password under the minimum length is told so, in the same line.
  const isTooShort = [...password].length < minimumPasswordLength;
  const word = isTooShort ? t('passwordStrength.tooShort') : t(`passwordStrength.${strength}`);
  return (
    <div className="mt-1.5 flex flex-col gap-1.5" data-password-strength={strength}>
      <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-(--track)">
        <span
          data-strength-fill
          className="block h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${filledPercent}%`, backgroundColor: stepColour[strength] }}
        />
      </div>
      <p id={id} aria-live="polite" className="m-0 flex items-center gap-1.5 text-[13px] text-body">
        {stepsWithTick.has(strength) && <CheckIcon />}
        <span>
          {t('passwordStrength.label')}: <strong>{word}</strong>
        </span>
      </p>
    </div>
  );
}
