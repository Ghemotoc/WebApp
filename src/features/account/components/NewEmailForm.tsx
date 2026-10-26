/**
 * NewEmailForm: the "New email address" field and "Change email" button in Settings › Email
 * address (story S1-E2-05, added 25 Oct 2026).
 *
 * Pressing the button asks Supabase to send a 6-digit code to the current and the new address
 * (Robert, 25 Oct 2026, 09:15); the line under the field says it was sent or why it was refused.
 * Who shows it: EmailSettingsSection. What it calls: useMyEmail's change() through props.
 */
import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { EmailChangeOutcome } from '../api/emailAddress';
import type { useMyEmail } from '../hooks/useMyEmail';

/** The locale key of each refusal; 'sent' has its own success notice. */
const refusalKeys: Record<Exclude<EmailChangeOutcome, 'sent'>, string> = {
  same_address: 'email.sameAddress',
  invalid_address: 'email.invalidAddress',
  address_in_use: 'email.addressInUse',
  too_many_attempts: 'email.tooManyAttempts',
};

/**
 * The line under the form: sent, refused, failed, or nothing yet.
 *
 * @param props.email - useMyEmail's result
 * @param props.typedEmail - the address the person asked for
 * @returns a notice, or null
 */
function ChangeNotice({
  email,
  typedEmail,
}: {
  email: ReturnType<typeof useMyEmail>;
  typedEmail: string;
}) {
  const { t } = useTranslation('account');
  if (email.changeFailed) return <Notice tone="error">{t('email.changeFailed')}</Notice>;
  if (email.outcome === null) return null;
  if (email.outcome === 'sent') {
    return (
      <Notice tone="success">
        {t('email.sent', { email: typedEmail.trim() || (email.pendingEmail ?? '') })}
      </Notice>
    );
  }
  return <Notice tone="error">{t(refusalKeys[email.outcome])}</Notice>;
}

/** What the form needs from the section. */
export interface NewEmailFormProps {
  email: ReturnType<typeof useMyEmail>;
  typedEmail: string;
  /** False right after a change finished, so the old "sent" line doesn't linger. */
  showNotice: boolean;
  onTyped: (value: string) => void;
}

/**
 * Renders the field, its notice and the button.
 *
 * @returns the form
 */
export function NewEmailForm({ email, typedEmail, showNotice, onTyped }: NewEmailFormProps) {
  const { t } = useTranslation('account');

  /** Asks for the change, unless the field is empty. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (typedEmail.trim() !== '') email.change(typedEmail);
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <TextInput
        id="settings-new-email"
        type="email"
        autoComplete="email"
        label={t('email.newLabel')}
        hint={t('email.newHint')}
        value={typedEmail}
        onChange={(event) => {
          email.resetChange();
          onTyped(event.target.value);
        }}
      />
      {showNotice && <ChangeNotice email={email} typedEmail={typedEmail} />}
      <div>
        <Button
          type="submit"
          variant="secondary"
          disabled={email.isChanging || typedEmail.trim() === ''}
        >
          {email.isChanging ? t('email.sending') : t('email.change')}
        </Button>
      </div>
    </form>
  );
}
