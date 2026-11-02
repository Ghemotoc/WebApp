/**
 * StaffCertificatesPage: /staff/schools/certificates, staff look a certificate up by its code and
 * revoke it (bundle CLASSES, part e; story S1-E8-12 criterion 7: "Given staff revoke a certificate
 * (an error or a rule breach), when its code is checked, then the page shows revoked").
 *
 * What it shows: the Schools tabs, a code field, then the certificate's details (never the
 * student's printed name) and, while it is valid, a reason field and "Revoke". Revoking is in the
 * audit log.
 * Who shows it: the router, inside StaffLayout; the database lets in only staff with Schools
 * access. What it calls: useStaffCertificate() → admin_certificate() and useRevokeCertificate() →
 * admin_revoke_certificate(). Plain components, no doodles.
 */
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { certificateFailureOf } from '@/features/certificates/hooks/useCertificates';
import { useStaffCertificate } from '@/features/certificates/hooks/useClassCertificates';

import { SchoolsTabs } from './SchoolsTabs';
import { StaffCertificateCard } from './StaffCertificateCard';

/**
 * The answer to a look-up: refused, failed, none found, or the certificate.
 *
 * @param props.code - the code looked up
 * @returns the answer
 */
function LookUpAnswer({ code }: { code: string }) {
  const { t } = useTranslation('staff');
  const read = useStaffCertificate(code);
  const failure = certificateFailureOf(read.error);
  if (failure?.failure === 'not_allowed') {
    return <p className="m-0 text-body">{t('staffCertificates.notAllowed')}</p>;
  }
  if (failure !== null) return <Notice tone="error">{t('staffCertificates.loadFailed')}</Notice>;
  if (read.data === undefined) return null;
  if (read.data === null) return <Notice tone="info">{t('staffCertificates.none')}</Notice>;
  return <StaffCertificateCard certificate={read.data} />;
}

/**
 * Renders the page.
 *
 * @returns the Certificates screen
 */
export function StaffCertificatesPage() {
  const { t } = useTranslation('staff');
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');

  /** Looks the typed code up. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCode(typed.trim());
  }

  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staffCertificates.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staffCertificates.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staffCertificates.heading')}
        </h1>
        <p className="m-0 text-body">{t('staffCertificates.intro')}</p>
      </div>
      <SchoolsTabs />
      <div className="flex max-w-[860px] flex-col gap-6">
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <TextInput
            id="staff-certificate-code"
            label={t('staffCertificates.codeLabel')}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setTyped(event.target.value)}
          />
          <Button type="submit">{t('staffCertificates.find')}</Button>
        </form>
        {code !== '' && <LookUpAnswer code={code} />}
      </div>
    </PageContainer>
  );
}
