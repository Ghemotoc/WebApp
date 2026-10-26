/**
 * EmailCodeField: one of the two 6-digit code boxes of an email change (story S1-E2-05; Robert,
 * 25 Oct 2026, 09:15).
 *
 * A right code is locked with "This code is right." under it, because Supabase accepts each
 * code only once; a wrong or expired one says so. The numeric keyboard and "one-time-code"
 * autofill help on phones.
 * Who shows it: EmailCodesForm, twice. What it calls: TextInput.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

import type { EmailCodeCheck } from '../api/emailAddress';

/** One box: its id, label, the address its code went to, the check so far and the value. */
export interface EmailCodeFieldProps {
  id: string;
  label: string;
  address: string;
  result: EmailCodeCheck | null;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Renders the box.
 *
 * @returns the labelled field
 */
export function EmailCodeField({
  id,
  label,
  address,
  result,
  value,
  onChange,
}: EmailCodeFieldProps) {
  const { t } = useTranslation('account');
  const isConfirmed = result === 'confirmed';
  return (
    <TextInput
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      label={label}
      hint={isConfirmed ? t('email.codeAccepted') : t('email.codeHint', { email: address })}
      errorMessage={result === 'wrong_code' ? t('email.wrongCode') : undefined}
      disabled={isConfirmed}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
