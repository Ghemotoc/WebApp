/**
 * VerifyCertificatePage: /verify, the public check of a certificate's code (bundle CLASSES, part
 * e; story S1-E8-12 criteria 6 to 8: valid with the programme, the result and the date, "revoked",
 * or "no longer available"; never the student's name).
 *
 * What it shows: a code field and Check, then the answer. A code in the address (?code=…) is
 * checked straight away, so a link can carry it.
 * Who shows it: the router, for anyone, signed in or not. Printed certificates point here.
 * What it calls: useCertificateCheck() → verify_certificate().
 */
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';

import type { CertificateCheck } from '../api/certificates';
import { useCertificateCheck } from '../hooks/useCertificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The notice tone for each answer. */
const toneForStatus = {
  valid: 'success',
  revoked: 'error',
  retired: 'info',
  unknown: 'info',
} as const;

/**
 * The answer: its status, and for a known certificate its details.
 *
 * @param props.check - the answer
 * @returns the answer section
 */
function CheckAnswer({ check }: { check: CertificateCheck }) {
  const { t, i18n } = useCertificatesTranslation();
  const language = certificateLanguageOf(i18n.language);
  const rows = [];
  if (check.programmeName !== null)
    rows.push({ label: t('verify.programme'), value: check.programmeName });
  if (check.result !== null)
    rows.push({ label: t('verify.result'), value: t(`results.${check.result}`) });
  if (check.schoolName !== null) rows.push({ label: t('verify.school'), value: check.schoolName });
  if (check.signedAt !== null) {
    rows.push({ label: t('verify.date'), value: certificateDate(check.signedAt, language) });
  }
  return (
    <section aria-label={t(`verify.${check.status}`)} className="flex flex-col gap-4">
      <Notice tone={toneForStatus[check.status]}>{t(`verify.${check.status}`)}</Notice>
      {rows.length > 0 && <LabelRows rows={rows} />}
    </section>
  );
}

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

  /** Checks the typed code, keeping it in the address. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchParams({ code: typed.trim() });
  }

  return (
    <PageContainer className="flex max-w-[720px] flex-col gap-6 py-12">
      <title>{t('verify.documentTitle')}</title>
      <header className="flex flex-col gap-3">
        <Eyebrow>{t('verify.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('verify.title')}
        </h1>
        <p className="m-0 text-body">{t('verify.intro')}</p>
      </header>
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <TextInput
          id="certificate-code"
          label={t('verify.codeLabel')}
          hint={t('verify.codeHint')}
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
        />
        <Button type="submit">{t('verify.check')}</Button>
      </form>
      <div aria-live="polite">
        {check.isError && <Notice tone="error">{t('verify.loadFailed')}</Notice>}
        {check.data !== undefined && <CheckAnswer check={check.data} />}
      </div>
    </PageContainer>
  );
}
