/**
 * MyCertificatesPage: /certificates, "Certificates" (bundle CLASSES, part e; story S1-E8-12
 * criterion 1: "each student gets a certificate under My certificates in their account").
 *
 * What it shows: every certificate the signed-in student has, newest first, each with its
 * programme, class, result and date and a link to open it; a link to the public check page.
 * Who shows it: the router; a certificate notification and Settings link here.
 * What it calls: useMyCertificates() → my_certificates(). Plain card style, no doodles.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyCertificate } from '../api/certificates';
import { useMyCertificates } from '../hooks/useCertificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/**
 * One certificate in the list.
 *
 * @param props.certificate - the certificate
 * @returns the list item
 */
function CertificateRow({ certificate }: { certificate: MyCertificate }) {
  const { t, i18n } = useCertificatesTranslation();
  const language = certificateLanguageOf(i18n.language);
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <InfoPill tone={certificate.result === 'participant' ? 'sky' : 'gold'}>
          {t(`results.${certificate.result}`)}
        </InfoPill>
        {certificate.isRevoked && <InfoPill tone="blush">{t('my.revoked')}</InfoPill>}
      </div>
      <h2 className="m-0 font-heading text-xl font-bold text-heading">
        <Link to={`/certificates/${certificate.id}`} className="text-link underline">
          {t('my.open', { programme: certificate.programmeName })}
        </Link>
      </h2>
      <p className="m-0 text-body">
        {certificate.isContest
          ? t('sheet.contestLabel')
          : [certificate.className, certificate.schoolName].filter(Boolean).join(' · ')}
      </p>
      <p className="m-0 text-sm text-body">
        {t('my.signed', { date: certificateDate(certificate.signedAt, language) })}
      </p>
    </li>
  );
}

/**
 * The list, or its empty and error states.
 *
 * @returns the body for a signed-in student
 */
function MyCertificatesList() {
  const { t } = useCertificatesTranslation();
  const read = useMyCertificates();
  if (read.isError) return <Notice tone="error">{t('my.loadFailed')}</Notice>;
  if (read.data === undefined) return null;
  if (read.data.length === 0) return <p className="m-0 text-body">{t('my.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {read.data.map((certificate) => (
        <CertificateRow key={certificate.id} certificate={certificate} />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MyCertificatesPage() {
  const { t } = useCertificatesTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-12">
      <title>{t('my.documentTitle')}</title>
      <header className="flex flex-col gap-3">
        <Eyebrow>{t('my.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('my.title')}
        </h1>
        <p className="m-0 text-body">{t('my.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 text-body">
          {t('my.signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('my.logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && <MyCertificatesList />}
      <p className="m-0">
        <Link to="/verify" className="text-link underline">
          {t('my.checkLink')}
        </Link>
      </p>
    </PageContainer>
  );
}
