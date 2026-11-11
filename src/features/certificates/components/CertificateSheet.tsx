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
 * A contest certificate (S1-E11-15 criterion 9; CONTESTS-13b2c) names the contest in the sheet's
 * language, has no school, class or teacher and only our signature.
 * Since bundle G13a the sheet sits in its look (CertificateFrame): the colour and faint pattern the
 * teacher chose at signing, and the seal at the top. The words are on near-white paper in fixed
 * dark ink, the same by day and at night, so they keep their contrast on every colour; the frame
 * prints in colour too.
 * Who shows it: CertificatePage. Decorative: the frame, pattern and seal, hidden from screen
 * readers (no doodles; the boards' QR code is left out).
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { brand } from '@/config/brand';

import type { MyCertificate } from '../api/certificates';
import { certificateDate, type CertificateLanguage } from '../lib/certificateDate';
import { CertificateFrame, CertificateSeal } from './CertificateFrame';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The paper's fixed inks (G13a): dark on near-white, whatever the theme. */
const ink = {
  text: 'text-[#2A1E14]',
  heading: 'text-[#2A0E33]',
  muted: 'text-[#5A4A40]',
  line: 'border-[#2A1E14]',
  softLine: 'border-[#2A1E14]/20',
} as const;

/** The sentence that says what the student did, by result. */
const reasonKeys = {
  winner: 'sheet.forWinner',
  finalist: 'sheet.forFinalist',
  participant: 'sheet.forParticipant',
} as const;

/** The same sentence for a writing contest, which has no class (CONTESTS-13b2c). */
const contestReasonKeys = {
  winner: 'sheet.forContestWinner',
  finalist: 'sheet.forContestFinalist',
  participant: 'sheet.forContestParticipant',
} as const;

/**
 * The sentence under the name: what the person did, in which programme or contest.
 *
 * @param certificate - the certificate
 * @param language - the language the sheet prints in
 * @param t - the certificates translation function, fixed to that language
 * @returns the sentence
 */
function reasonSentence(
  certificate: MyCertificate,
  language: CertificateLanguage,
  t: TFunction,
): string {
  // A contest prints its name in the sheet's language; a class prints the programme and class.
  if (certificate.isContest && certificate.contestName !== null) {
    return t(contestReasonKeys[certificate.result], {
      programme: certificate.contestName[language],
    });
  }
  return t(reasonKeys[certificate.result], {
    programme: certificate.programmeName,
    className: certificate.className,
  });
}

/**
 * The signatures: ours first, then the teacher's for a class certificate. A contest is ours alone.

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
      <div className={`flex flex-col gap-1 border-t ${ink.line} pt-2`}>
        <p className={`m-0 text-xs ${ink.muted}`}>{signedOn}</p>
        <p className="m-0 font-semibold">{certificate.signatoryName}</p>
        <p className={`m-0 text-sm ${ink.muted}`}>{t('sheet.companyRole')}</p>
      </div>
      {!certificate.isContest && (
        <div className={`flex flex-col gap-1 border-t ${ink.line} pt-2`}>
          <p className={`m-0 text-xs ${ink.muted}`}>{signedOn}</p>
          <p className="m-0 font-semibold">{certificate.teacherName}</p>
          <p className={`m-0 text-sm ${ink.muted}`}>{teacherRole}</p>
        </div>
      )}
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
  // What ran the programme: a contest, a class at a school or a class.
  let footerText = t('sheet.footer');
  if (certificate.isContest) footerText = t('sheet.contestFooter');
  else if (school !== null) footerText = t('sheet.footerSchool', { school });
  return (
    <footer className={`flex flex-col gap-3 border-t ${ink.softLine} pt-4 text-sm ${ink.muted}`}>
      <div className="flex flex-wrap justify-between gap-4">
        <p className="m-0">
          {t(certificate.isContest ? 'sheet.contestLabel' : 'sheet.programmeLabel')} ·{' '}
          {t(`results.${certificate.result}`)} · {year}
        </p>
        <p className="m-0">
          {t('sheet.checkTitle')}:{' '}
          {/* G13: a real link to the check, built from the site address in the brand config. */}
          <a
            href={`${brand.siteUrl}/verify?code=${encodeURIComponent(certificate.code)}`}
            className="underline underline-offset-2"
          >
            {brand.siteDomain}/verify
          </a>{' '}
          · <strong>{certificate.code}</strong> ·{' '}
          {t('sheet.issued', { date: certificateDate(certificate.signedAt, language) })}
        </p>
      </div>
      <p className="m-0 text-xs">{footerText}</p>
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
    <CertificateFrame
      look={certificate.look}
      patternId={`certificate-pattern-${certificate.id}`}
      className="certificate-sheet"
    >
      <article
        lang={language}
        aria-label={t('sheet.label')}
        className={`flex flex-col gap-8 p-6 sm:p-12 ${ink.text}`}
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col">
            <p className={`m-0 font-heading text-2xl font-extrabold ${ink.heading}`}>
              {brand.productName}
            </p>
            <p className={`m-0 text-sm ${ink.muted}`}>
              {t('common:shell.madeBy', { lng: language })}
            </p>
          </div>
          {school !== null && (
            <p className={`m-0 text-sm ${ink.muted}`}>{t('sheet.partnership', { school })}</p>
          )}
        </header>
        <div className="flex flex-col items-center gap-3 text-center">
          <CertificateSeal look={certificate.look} size="large" />
          <h2
            className={`m-0 font-heading text-[clamp(28px,5vw,44px)] leading-tight font-extrabold ${ink.heading}`}
          >
            {t(isAchievement ? 'sheet.titleAchievement' : 'sheet.titleParticipation')}
          </h2>
          <p className={`m-0 eyebrow-type ${ink.heading}`}>{t('sheet.awardedTo')}</p>
          <p
            className={`m-0 font-story text-[clamp(24px,4vw,40px)] font-semibold break-words ${ink.heading}`}
          >
            {awardedName}
          </p>
          <p className="m-0 max-w-[52ch]">{reasonSentence(certificate, language, t)}</p>
        </div>
        <CertificateSignatures certificate={certificate} language={language} />
        <CertificateFooter certificate={certificate} language={language} />
      </article>
    </CertificateFrame>
  );
}
