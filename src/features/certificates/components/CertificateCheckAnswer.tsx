/**
 * CertificateCheckAnswer: the answer box of the public check (board G17, user story 8.17; bundle
 * BOOKS-8, part 8c).
 *
 * What it shows: for a real certificate, "Real certificate · checked just now", the result and the
 * programme, the class and school it was given in, who signed it and when, and that no pupil's
 * name shows. Board G17 also shows "given to" a short name; story S1-E8-12 criterion 6 ("never
 * the student's name") wins over the board (CLAUDE.md, Designs), so that waits for Robert. A
 * withdrawn certificate says so, with the date. A retired or unknown code says so in one line.
 * Who shows it: VerifyCertificatePage, under the code field.
 * What it calls: nothing; the answer comes from useCertificateCheck().
 */
import { MetaLine } from '@/components/ui/MetaLine';

import type { CertificateCheck } from '../api/certificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The box every answer sits in; a real certificate adds a green edge (board G17). */
const boxClasses = 'flex flex-col gap-2 rounded-card bg-surface-solid p-4 sm:p-6';
const realEdgeClasses = 'shadow-[inset_0_0_0_1px_var(--success-border)]';

/**
 * The "Given with … Signed by … on …" sentence of a known certificate.
 *
 * @param props.check - the answer of a valid certificate
 * @returns the sentence
 */
function GivenInSentence({ check }: { check: CertificateCheck }) {
  const { t, i18n } = useCertificatesTranslation();
  const date =
    check.signedAt === null
      ? ''
      : certificateDate(check.signedAt, certificateLanguageOf(i18n.language));
  const values = {
    className: check.className ?? '',
    school: check.schoolName ?? '',
    teacher: check.teacherName ?? '',
    date,
  };
  // Step 1: a contest certificate is given by the product; a class one names its class and school.
  let givenIn = t('verify.givenInContest', values);
  if (!check.isContest) {
    givenIn =
      check.schoolName === null
        ? t('verify.givenInClass', values)
        : t('verify.givenInSchool', values);
  }
  // Step 2: who signed it: the teacher for a class, the product for a contest.
  const signedBy = check.isContest
    ? t('verify.signedByProduct', values)
    : t('verify.signedByTeacher', values);
  return <p className="m-0 type-body text-ink">{`${givenIn} ${signedBy}`}</p>;
}

/**
 * The heading: the result and the programme ("Finalist · Autumn short story contest").
 *
 * @param props.check - the answer of a known certificate
 * @returns the heading
 */
function AnswerHeading({ check }: { check: CertificateCheck }) {
  const { t } = useCertificatesTranslation();
  const parts = [
    check.result === null ? '' : t(`results.${check.result}`),
    check.programmeName ?? '',
  ];
  return (
    <h2 className="m-0 type-subheading break-words text-ink-heading">
      {parts.filter((part) => part !== '').join(' · ')}
    </h2>
  );
}

/**
 * The answer for a certificate that is real and still valid.
 *
 * @param props.check - the answer
 * @returns the box
 */
function RealAnswer({ check }: { check: CertificateCheck }) {
  const { t } = useCertificatesTranslation();
  return (
    <section aria-label={t('verify.valid')} className={`${boxClasses} ${realEdgeClasses}`}>
      <MetaLine
        facts={[{ text: t('verify.realState'), kind: 'state' }, { text: t('verify.checkedNow') }]}
      />
      <AnswerHeading check={check} />
      <GivenInSentence check={check} />
      <p className="m-0 max-w-none type-meta text-ink-muted">{t('verify.nameNote')}</p>
    </section>
  );
}

/**
 * The answer for a withdrawn certificate: it says so, with the date, and shows no name.
 *
 * @param props.check - the answer
 * @returns the box
 */
function RevokedAnswer({ check }: { check: CertificateCheck }) {
  const { t, i18n } = useCertificatesTranslation();
  const language = certificateLanguageOf(i18n.language);
  const date = check.revokedAt === null ? '' : certificateDate(check.revokedAt, language);
  return (
    <section aria-label={t('verify.revoked')} className={boxClasses}>
      <MetaLine
        facts={[
          { text: t('verify.revokedState'), kind: 'urgent' },
          { text: t('verify.checkedNow') },
        ]}
      />
      <AnswerHeading check={check} />
      <p className="m-0 type-body text-ink">{t('verify.revokedOn', { date })}</p>
    </section>
  );
}

/**
 * Renders the answer that matches the certificate's status.
 *
 * @param props.check - the answer from verify_certificate()
 * @returns the answer box
 */
export function CertificateCheckAnswer({ check }: { check: CertificateCheck }) {
  const { t } = useCertificatesTranslation();
  if (check.status === 'valid') return <RealAnswer check={check} />;
  if (check.status === 'revoked') return <RevokedAnswer check={check} />;
  // A retired or unknown code: one line, no details (S1-E8-12 criterion 8).
  return (
    <section aria-label={t(`verify.${check.status}`)} className={boxClasses}>
      <p className="m-0 type-body text-ink">{t(`verify.${check.status}`)}</p>
    </section>
  );
}
