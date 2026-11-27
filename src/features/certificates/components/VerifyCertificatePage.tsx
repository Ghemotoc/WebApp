/**
 * VerifyCertificatePage: /verify, the public check of a certificate's code (bundle CLASSES, part
 * e; story S1-E8-12 criteria 6 to 8; board G17 and user story 8.17, bundle BOOKS-8, part 8c).
 *
 * What it shows: "Is this certificate real?", a code field with Check, then the answer: for a real
 * certificate the result and programme, who it was given to (the first name and the first letter
 * of the last name, or the pen name), the class and school, who signed it and when; a withdrawn
 * one says so with the date; an unknown code says so. A code in the address (?code=…) is checked
 * straight away, so a link can carry it. Pressing Check with an empty field says what is missing
 * (design books item 9).
 * Who shows it: the router, for anyone, signed in or not. Printed certificates point here.
 * What it calls: useCertificateCheck() → verify_certificate(); CertificateCheckAnswer draws the
 * answer.
 */
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { useMissingField } from '@/lib/forms/useMissingField';

import { useCertificateCheck } from '../hooks/useCertificates';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';
import { CertificateCheckAnswer } from './CertificateCheckAnswer';

/** The code field's id, so the "what is missing" message can take the focus there. */
const CODE_FIELD_ID = 'certificate-code';

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function VerifyCertificatePage() {
  const { t } = useCertificatesTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkedCode = searchParams.get('code') ?? '';
  const [typed, setTyped] = useState(checkedCode);
  const check = useCertificateCheck(checkedCode);
  const missingCode = useMissingField(typed.trim() === '', CODE_FIELD_ID);

  /** Checks the typed code, keeping it in the address so the answer can be shared. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchParams({ code: typed.trim() });
  }

  return (
    <PageContainer className="flex max-w-[1280px] flex-col gap-8 pt-6 pb-12 md:gap-12 lg:gap-16 lg:pt-12 lg:pb-20">
      <title>{t('verify.documentTitle')}</title>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 page-title break-words">{t('verify.title')}</h1>
        <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('verify.intro')}</p>
      </header>
      <form
        className="flex flex-col gap-2"
        noValidate
        onSubmit={missingCode.submitWhenReady(submit)}
      >
        <div className="flex flex-wrap items-end gap-2">
          <TextInput
            id={CODE_FIELD_ID}
            label={t('verify.codeLabel')}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            className="w-[240px] max-w-full"
            aria-invalid={missingCode.isShown ? true : undefined}
            aria-describedby={missingCode.isShown ? `${CODE_FIELD_ID}-missing` : undefined}
            onChange={(event) => setTyped(event.target.value)}
          />
          <Button type="submit" size="lg">
            {t('verify.check')}
          </Button>
        </div>
        {missingCode.isShown && (
          <p id={`${CODE_FIELD_ID}-missing`} className="m-0 type-body text-destructive">
            {t('verify.codeMissing')}
          </p>
        )}
      </form>
      {/* The answer is announced when it arrives. */}
      <div aria-live="polite">
        {check.isError && <Notice tone="error">{t('verify.loadFailed')}</Notice>}
        {check.data !== undefined && <CertificateCheckAnswer check={check.data} />}
      </div>
    </PageContainer>
  );
}
