/**
 * CertificatePage: /certificates/:certificateId, one of the member's certificates (bundle CLASSES,
 * part e; story S1-E8-12 criteria 2 and 4; board G16, bundle BOOKS-8, part 8c).
 *
 * What it shows: a breadcrumb back to Certificates, the programme as the title with a meta line
 * (result, class, who signed it, date), then the certificate beside a "Name and language" panel
 * (the printed name, the language it prints in, Print or save as PDF, Save, and where anyone can
 * check it). A revoked certificate shows a note instead and can't be printed. A contest
 * certificate has no printed-name field: a real name is stored only with a class certificate
 * (CLAUDE.md rule 5; CONTESTS-13b2c), so it always prints the pen name.
 * Who shows it: the router; Certificates links here. Only the member reaches it: the list comes
 * from my_certificates(), which answers only their own.
 * What it calls: useMyCertificates(), CertificateSheet and PrintedNameForm.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MyCertificate } from '../api/certificates';
import { useMyCertificates } from '../hooks/useCertificates';
import {
  certificateDate,
  certificateLanguageOf,
  type CertificateLanguage,
} from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateSheet } from './CertificateSheet';
import { PrintedNameForm } from './PrintedNameForm';

/**
 * The facts under the title: result, class (or the product's contest), who signed it, the date.
 *
 * @param props.certificate - the certificate
 * @returns the meta line
 */
function CertificateFacts({ certificate }: { certificate: MyCertificate }) {
  const { t, i18n } = useCertificatesTranslation();
  const language = certificateLanguageOf(i18n.language);
  const place = certificate.isContest ? t('my.contestPlace') : certificate.className;
  const signedBy = certificate.isContest
    ? ''
    : t('page.signedBy', { name: certificate.teacherName });
  return (
    <MetaLine
      className="mt-1"
      facts={[
        { text: certificate.isRevoked ? t('my.revoked') : '', kind: 'urgent' },
        { text: t(`results.${certificate.result}`), kind: 'state' },
        { text: place },
        { text: signedBy },
        { text: certificateDate(certificate.signedAt, language) },
      ]}
    />
  );
}

/**
 * The sheet and the panel beside it, for a certificate that can be printed.
 *
 * @param props.certificate - the certificate
 * @returns the two columns (one on phones and tablets, the sheet first)
 */
function PrintableCertificate({ certificate }: { certificate: MyCertificate }) {
  const { i18n } = useCertificatesTranslation();
  // The certificate starts in the page's language; schools receive the Romanian version.
  const [language, setLanguage] = useState<CertificateLanguage>(
    certificateLanguageOf(i18n.language),
  );
  return (
    <div className="grid items-start gap-8 md:gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-16">
      <div className="min-w-0">
        <CertificateSheet certificate={certificate} language={language} />
      </div>
      <PrintedNameForm
        certificate={certificate}
        language={language}
        onLanguageChange={setLanguage}
      />
    </div>
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
  if (certificate === undefined) return <p className="m-0 text-ink-muted">{t('page.notFound')}</p>;
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
    <PageContainer className="flex max-w-[1280px] flex-col gap-8 pt-6 pb-12 md:gap-12 lg:gap-16 lg:pt-12 lg:pb-20">
      <title>{t('page.documentTitle', { programme: heading })}</title>
      <Breadcrumb
        label={t('page.breadcrumb')}
        steps={[{ label: t('page.back'), to: '/certificates' }, { label: heading }]}
      />
      <header className="flex flex-col gap-2">
        <h1 className="m-0 page-title break-words">{heading}</h1>
        {certificate !== undefined && <CertificateFacts certificate={certificate} />}
      </header>
      <CertificateBody read={read} certificate={certificate} />
    </PageContainer>
  );
}
