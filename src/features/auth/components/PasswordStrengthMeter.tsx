/**
 * PasswordStrengthMeter: four segments under a new password, with the word underneath (bundle G3
 * COMPONENTS; handoff "Fields and forms": red weak, yellow fair, green strong, dark green very
 * strong).
 *
 * The word says the step, so the meter never rests on colour alone (WCAG 1.4.1); the number of
 * filled segments says it again. Screen readers hear "Password strength: Fair" politely as the
 * person types. It is a hint only: the rules are the field's own checks (passwordStrength.ts).
 * Who shows it: PasswordFields (sign-up) and NewPasswordForm (a new password after a reset).
 * What it calls: lib/passwordStrength.ts.
 */
import { useTranslation } from 'react-i18next';

import {
  passwordStrength,
  passwordStrengths,
  type PasswordStrength,
} from '../lib/passwordStrength';

/** Each step's colour token. */
const segmentColour: Record<PasswordStrength, string> = {
  weak: 'var(--strength-weak)',
  fair: 'var(--strength-fair)',
  strong: 'var(--strength-strong)',
  'very-strong': 'var(--strength-very-strong)',
};

/**
 * Renders the meter, or nothing while the field is empty.
 *
 * @param password - the password as typed
 * @param id - an id for the word, so the field can point at it with aria-describedby
 * @returns the meter
 */
export function PasswordStrengthMeter({ password, id }: { password: string; id: string }) {
  const { t } = useTranslation('auth');
  const strength = passwordStrength(password);
  if (strength === null) return null;
  const filled = passwordStrengths.indexOf(strength) + 1;
  return (
    <div className="flex flex-col gap-1.5" data-password-strength={strength}>
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {passwordStrengths.map((step, index) => (
          <span
            key={step}
            className="h-1.5 rounded-full bg-(--track)"
            style={index < filled ? { backgroundColor: segmentColour[strength] } : undefined}
          />
        ))}
      </div>
      <p id={id} aria-live="polite" className="m-0 text-[13px] text-body">
        {t('passwordStrength.label')}: <strong>{t(`passwordStrength.${strength}`)}</strong>
      </p>
    </div>
  );
}
