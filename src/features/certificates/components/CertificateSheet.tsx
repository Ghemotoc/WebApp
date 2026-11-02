/**
 * CertificateSheet: the certificate itself, an A4 page with real text (bundle CLASSES, part e;
 * story S1-E8-12 criterion 4; boards Certificate-Participation and Certificate-Winner).
 *
 * What it shows: the product's name, "In partnership with" the school, the title, the name it is
 * awarded to (the real name the student typed, or the pen name), the programme, the class and the
 * result, two signatures (ours first, then the teacher's, "signed electronically" with the date of
 * their approval, the proposal for OPEN Q71), the result and year, the code with where to check
 * it, and the line about who ran the programme.
 * The words are in the certificate's own language (Romanian or English), whatever the page's
 * language, and the sheet says so with lang. The browser prints it as an A4 page (index.css,
 * "certificate-sheet"); its "Save as PDF" keeps the text as real, tagged text, not a picture
 * (proposal: a server-made PDF comes with S1-E11-09b).
 * Who shows it: CertificatePage. Decorative: none (no doodles; the boards' QR code is left out).
 */
import { useTranslation } from 'react-i18next';

import { brand } from '@/config/brand';

import type { MyCertificate } from '../api/certificates';
import { certificateDate, type CertificateLanguage } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The sentence that says what the student did, by result. */
const reasonKeys = {
  winner: 'sheet.forWinner',
  finalist: 'sheet.forFinalist',
  participant: 'sheet.forParticipant',
} as const;

/**
 * The two signatures: ours first, then the teacher's.
 *
 * @param props.certificate - the certificate
 * @param props.language - its language
 * @returns the signature row
 */
function CertificateSignatures({
  certificate,
  language,
}: {
  certificate: MyCertificate;
  language: CertificateLanguage;
}) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(language, 'certificates');
  const signedOn = t('sheet.signedElectronically', {
    date: certificateDate(certificate.signedAt, language),
  });
  const teacherRole =
    certificate.schoolName === null
      ? t('sheet.teacherRole')
      : t('sheet.teacherRoleAtSchool', { school: certificate.schoolName });
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-1 border-t border-ink pt-2">
        <p className="m-0 text-xs text-body">{signedOn}</p>
        <p className="m-0 font-semibold text-ink">{certificate.signatoryName}</p>
        <p className="m-0 text-sm text-body">{t('sheet.companyRole')}</p>
      </div>
      <div className="flex flex-col gap-1 border-t border-ink pt-2">
        <p className="m-0 text-xs text-body">{signedOn}</p>
        <p className="m-0 font-semibold text-ink">{certificate.teacherName}</p>
        <p className="m-0 text-sm text-body">{teacherRole}</p>
      </div>
    </div>
  );
}

/**
 * The foot of the sheet: the result and year, where and how to check the code, and who ran the
 * programme.
 *
 * @param props.certificate - the certificate
 * @param props.language - its language
 * @returns the footer
 */
function CertificateFooter({
  certificate,
  language,
}: {
  certificate: MyCertificate;
  language: CertificateLanguage;
}) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(language, 'certificates');
  const school = certificate.schoolName;
  const year = new Date(certificate.signedAt).getFullYear();
  return (
    <footer className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-body">
      <div className="flex flex-wrap justify-between gap-4">
        <p className="m-0">
          {t('sheet.programmeLabel')} · {t(`results.${certificate.result}`)} · {year}
        </p>
        <p className="m-0">
          {t('sheet.checkTitle')}: {brand.siteDomain}/verify · <strong>{certificate.code}</strong> ·{' '}
          {t('sheet.issued', { date: certificateDate(certificate.signedAt, language) })}
        </p>
      </div>
      <p className="m-0 text-xs">
        {school === null ? t('sheet.footer') : t('sheet.footerSchool', { school })}
      </p>
    </footer>
  );
}

/**
 * Renders the certificate.
 *
 * @param props.certificate - the certificate
 * @param props.language - the language it prints in
 * @returns the sheet
 */
export function CertificateSheet({
  certificate,
  language,
}: {
  certificate: MyCertificate;
  language: CertificateLanguage;
}) {
  useCertificatesTranslation();
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(language, 'certificates');
  // Criterion 2: the real name only when the student typed one, otherwise the pen name.
  const awardedName = certificate.printedName ?? certificate.penName;
  const isAchievement = certificate.result !== 'participant';
  const school = certificate.schoolName;
  return (
    <article
      lang={language}
      aria-label={t('sheet.label')}
      className="certificate-sheet flex flex-col gap-8 rounded-card border border-border bg-surface p-6 text-ink sm:p-12"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col">
          <p className="m-0 font-heading text-2xl font-extrabold text-heading">
            {brand.productName}
          </p>
          <p className="m-0 text-sm text-body">{t('common:shell.madeBy', { lng: language })}</p>
        </div>
        {school !== null && (
          <p className="m-0 text-sm text-body">{t('sheet.partnership', { school })}</p>
        )}
      </header>
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="m-0 font-heading text-[clamp(28px,5vw,44px)] leading-tight font-extrabold text-heading">
          {t(isAchievement ? 'sheet.titleAchievement' : 'sheet.titleParticipation')}
        </h2>
        <p className="m-0 font-eyebrow text-[14px] text-eyebrow">{t('sheet.awardedTo')}</p>
        <p className="m-0 font-heading text-[clamp(24px,4vw,36px)] font-bold break-words text-ink">
          {awardedName}
        </p>
        <p className="m-0 max-w-[52ch] text-body">
          {t(reasonKeys[certificate.result], {
            programme: certificate.programmeName,
            className: certificate.className,
          })}
        </p>
      </div>
      <CertificateSignatures certificate={certificate} language={language} />
      <CertificateFooter certificate={certificate} language={language} />
    </article>
  );
}
