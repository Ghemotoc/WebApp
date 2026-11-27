/**
 * MyCertificatesPage: /certificates, "Certificates" (bundle CLASSES, part e; story S1-E8-12
 * criterion 1: "each student gets a certificate under My certificates in their account"; board
 * G15, bundle BOOKS-8, part 8c).
 *
 * What it shows: every certificate the signed-in member has, newest first, as a list of rows: a
 * dot in the certificate's colour, the programme as the link, then one meta line with the result,
 * the class (or the product's contest), the teacher, the date and the code. "Check a code" opens
 * the public check.
 * Who shows it: the router; a certificate notification and Settings link here.
 * What it calls: useMyCertificates() → my_certificates().
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyCertificate } from '../api/certificates';
import { useMyCertificates } from '../hooks/useCertificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import { certificateFrameBackground } from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/**
 * The facts under a certificate's title: result, class or contest, teacher, date, code, and
 * "Revoked" in red when it was withdrawn (board G15; the word carries the state, not the colour).
 *
 * @param certificate - the certificate
 * @param t - the translate function
 * @param language - the page's certificate language, for the date
 * @returns the facts in reading order
 */
function rowFacts(
  certificate: MyCertificate,
  t: ReturnType<typeof useCertificatesTranslation>['t'],
  language: ReturnType<typeof certificateLanguageOf>,
) {
  const place = certificate.isContest ? t('my.contestPlace') : certificate.className;
  return [
    { text: certificate.isRevoked ? t('my.revoked') : '', kind: 'urgent' as const },
    { text: t(`results.${certificate.result}`), kind: 'state' as const },
    { text: place },
    { text: certificate.isContest ? '' : certificate.teacherName },
    { text: certificateDate(certificate.signedAt, language) },
    { text: t('my.code', { code: certificate.code }) },
  ];
}

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
    <li className="flex items-center gap-4 border-t border-hairline py-3">
      {/* The certificate's own colour, as on the sheet (G15's tile); it says nothing on its own. */}
      <span
        aria-hidden="true"
        className="size-9 shrink-0 rounded-full"
        style={{ background: certificateFrameBackground(certificate.look.colour) }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="m-0 type-label break-words">
          <Link
            to={`/certificates/${certificate.id}`}
            className="text-ink-heading no-underline hover:underline"
          >
            {certificate.programmeName}
            {/* Two certificates can share a programme (a result and Readers' choice, S1-E8-17),
                so a screen reader also hears which one this link opens. */}
            <span className="sr-only">, {t(`results.${certificate.result}`)}</span>
          </Link>
        </h2>
        <MetaLine facts={rowFacts(certificate, t, language)} />
      </div>
    </li>
  );
}

/**
 * The list, or its empty and error states.
 *
 * @returns the body for a signed-in member
 */
function MyCertificatesList() {
  const { t } = useCertificatesTranslation();
  const read = useMyCertificates();
  if (read.isError) return <Notice tone="error">{t('my.loadFailed')}</Notice>;
  if (read.data === undefined) return null;
  if (read.data.length === 0) {
    return <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('my.empty')}</p>;
  }
  return (
    <ul aria-label={t('my.listLabel')} className="m-0 flex list-none flex-col p-0">
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
    <PageContainer className="flex max-w-[1280px] flex-col gap-8 pt-6 pb-12 md:gap-12 lg:gap-16 lg:pt-12 lg:pb-20">
      <title>{t('my.documentTitle')}</title>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 page-title break-words">{t('my.title')}</h1>
        <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('my.intro')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to="/verify" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
            {t('my.checkLink')}
          </Link>
        </div>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 type-body text-ink-muted">
          {t('my.signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('my.logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && <MyCertificatesList />}
    </PageContainer>
  );
}
