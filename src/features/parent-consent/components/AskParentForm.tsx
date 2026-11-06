/**
 * AskParentForm: the writer gives a parent's or guardian's email and the email's language, then
 * "Send the email" (story S1-E2-03, criterion 1; board ParentConsent 2.4, left side).
 *
 * Who shows it: ParentConsentPage, before the first email and after "Change the email".
 * What it calls: onSend(request), which useMyParentConsent sends to our server; the server makes
 * the link, so the writer never sees it. The email is checked with the shared zod schema first.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import {
  consentLanguages,
  consentRequestSchema,
  type ConsentFailure,
  type ConsentLanguage,
  type ConsentRequest,
} from '../../../schemas/parentConsent';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface AskParentFormProps {
  /** The language picked at first: the email's last language, or the interface's. */
  initialLanguage: ConsentLanguage;
  isSending: boolean;
  failure: ConsentFailure | null;
  onSend: (request: ConsentRequest) => Promise<unknown>;
}

/**
 * Renders the form.
 *
 * @returns the email field, the language drop-down and the button
 */
export function AskParentForm({ initialLanguage, isSending, failure, onSend }: AskParentFormProps) {
  const { t } = useTranslation('account');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState<ConsentLanguage>(initialLanguage);
  const [isEmailWrong, setIsEmailWrong] = useState(false);

  /** Checks the email here first, then asks our server; a refusal shows from `failure`. */
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = consentRequestSchema.safeParse({ parentEmail: email, language });
    setIsEmailWrong(!parsed.success);
    if (parsed.success) void onSend(parsed.data).catch(errorShownByHook);
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <TextInput
        id="parent-consent-email"
        type="email"
        autoComplete="off"
        label={t('parentConsent.emailLabel')}
        value={email}
        errorMessage={isEmailWrong ? t('parentConsent.failures.invalid') : undefined}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Select
        id="parent-consent-language"
        label={t('parentConsent.languageLabel')}
        isLabelVisible
        placement="form"
        value={language}
        onChange={(value) => setLanguage(value === 'en' ? 'en' : 'ro')}
        options={consentLanguages.map((code) => ({
          value: code,
          label: t(`parentConsent.languages.${code}`),
          lang: code,
        }))}
      />
      {failure !== null && <Notice tone="error">{t(`parentConsent.failures.${failure}`)}</Notice>}
      <Button type="submit" className="self-start" disabled={isSending}>
        {isSending ? t('parentConsent.sending') : t('parentConsent.send')}
      </Button>
    </form>
  );
}
