/**
 * CertificatePage: /certificates/:certificateId, one of the student's certificates (bundle CLASSES,
 * part e; story S1-E8-12 criteria 2 and 4).
 *
 * What it shows: a link back to My certificates, the printed-name form, the language the
 * certificate prints in (Romanian or English), "Print or save as PDF" and the certificate itself.
 * A revoked certificate shows a note instead and can't be printed.
 * Who shows it: the router; My certificates links here. Only the student reaches it: the list comes
 * from my_certificates(), which answers only their own.
 * What it calls: useMyCertificates(), PrintedNameForm, CertificateSheet and window.print().
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import type { MyCertificate } from '../api/certificates';
import { useMyCertificates } from '../hooks/useCertificates';
import { certificateLanguageOf, type CertificateLanguage } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateSheet } from './CertificateSheet';
import { PrintedNameForm } from './PrintedNameForm';

/** The two languages, each named in its own language (WCAG 3.1.2). */
const languageOptions = [
  { value: 'ro', label: 'Română', lang: 'ro' },
  { value: 'en', label: 'English', lang: 'en' },
];

/**
 * The tools and the sheet for a certificate that can be printed.
 *
 * @param props.certificate - the certificate
 * @returns the form, the language choice, the print button and the sheet
 */
function PrintableCertificate({ certificate }: { certificate: MyCertificate }) {
  const { t, i18n } = useCertificatesTranslation();
  // The certificate starts in the page's language; schools receive the Romanian version.
  const [language, setLanguage] = useState<CertificateLanguage>(
    certificateLanguageOf(i18n.language),
  );
  return (
    <>
      <PrintedNameForm certificate={certificate} />
      <div className="flex flex-wrap items-center gap-4">
        <Select
          id="certificate-language"
          label={t('page.languageLabel')}
          isLabelVisible
          options={languageOptions}
          value={language}
          onChange={(value) => setLanguage(certificateLanguageOf(value))}
        />
        <Button onClick={() => window.print()}>{t('page.print')}</Button>
      </div>
      <p className="m-0 text-sm text-body">{t('page.printHint')}</p>
      <CertificateSheet certificate={certificate} language={language} />
    </>
  );
}

/**
 * What goes under the heading: an error, "not found", the revoked note or the printable
 * certificate.
 *
 * @param props.read - the list query
 * @param props.certificate - the certificate from the list, if found
 * @returns the body
 */
function CertificateBody({
  read,
  certificate,
}: {
  read: ReturnType<typeof useMyCertificates>;
  certificate: MyCertificate | undefined;
}) {
  const { t } = useCertificatesTranslation();
  if (read.isError) return <Notice tone="error">{t('my.loadFailed')}</Notice>;
  if (!read.isSuccess) return null;
  if (certificate === undefined) return <p className="m-0 text-body">{t('page.notFound')}</p>;
  if (certificate.isRevoked) return <Notice tone="info">{t('page.revokedNote')}</Notice>;
  return <PrintableCertificate certificate={certificate} />;
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function CertificatePage() {
  const { t } = useCertificatesTranslation();
  const { certificateId = '' } = useParams();
  const read = useMyCertificates();
  const certificate = read.data?.find((candidate) => candidate.id === certificateId);
  const heading = certificate === undefined ? t('my.title') : certificate.programmeName;
  return (
    <PageContainer className="flex max-w-[900px] flex-col gap-6 py-12">
      <title>{t('page.documentTitle', { programme: heading })}</title>
      <nav aria-label={t('page.back')}>
        <Link to="/certificates" className="text-link underline">
          {t('page.back')}
        </Link>
      </nav>
      <h1 className="m-0 font-heading text-[clamp(28px,4vw,40px)] leading-[1.05] font-extrabold text-heading">
        {heading}
      </h1>
      <CertificateBody read={read} certificate={certificate} />
    </PageContainer>
  );
}
