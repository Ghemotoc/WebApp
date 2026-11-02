/**
 * StaffCertificateCard: one certificate on Staff › Schools › Certificates, with "Revoke" (bundle
 * CLASSES, part e; story S1-E8-12 criterion 7).
 *
 * What it shows: the code, its state, the student's username, the programme, the result, the
 * class, the school, the teacher and the date, as label rows (DoD: a fine line between rows); a
 * revoked one adds when and why. A valid one has a reason field and "Revoke". Never the printed
 * real name.
 * Who shows it: StaffCertificatesPage. What it calls: useRevokeCertificate() →
 * admin_revoke_certificate(), which writes the audit log.
 */
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import type { StaffCertificate } from '@/features/certificates/api/classCertificates';
import { useRevokeCertificate } from '@/features/certificates/hooks/useClassCertificates';
import { useCertificatesTranslation } from '@/features/certificates/registerCertificatesTranslations';

/**
 * The reason field and "Revoke".
 *
 * @param props.code - the certificate's code
 * @returns the form
 */
function RevokeForm({ code }: { code: string }) {
  const { t } = useTranslation('staff');
  const revoking = useRevokeCertificate(code);
  const [reason, setReason] = useState('');

  /** Revokes the certificate with the reason. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await revoking.revoke(reason).catch(() => null);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Textarea
        id="staff-certificate-reason"
        label={t('staffCertificates.reasonLabel')}
        hint={t('staffCertificates.reasonHint')}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button
        type="submit"
        variant="destructive"
        className="self-start"
        disabled={revoking.isRunning}
      >
        {t('staffCertificates.revoke')}
      </Button>
      <div aria-live="polite">
        {revoking.failure !== null && (
          <Notice tone="error">
            {t(`staffCertificates.failures.${revoking.failure.failure}`)}
          </Notice>
        )}
      </div>
    </form>
  );
}

/**
 * Renders the card.
 *
 * @param props.certificate - the certificate
 * @returns the card
 */
export function StaffCertificateCard({ certificate }: { certificate: StaffCertificate }) {
  const { t, i18n } = useTranslation('staff');
  const certificates = useCertificatesTranslation();
  const signedOn = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(certificate.signedAt),
  );
  const rows = [
    {
      label: t('staffCertificates.status'),
      value: t(`staffCertificates.states.${certificate.status}`),
    },
    { label: t('staffCertificates.student'), value: `@${certificate.studentHandle}` },
    { label: t('staffCertificates.programme'), value: certificate.programmeName },
    {
      label: t('staffCertificates.result'),
      value: certificates.t(`results.${certificate.result}`),
    },
    { label: t('staffCertificates.class'), value: certificate.className },
    {
      label: t('staffCertificates.school'),
      value: certificate.schoolName ?? t('staffCertificates.noSchool'),
    },
    { label: t('staffCertificates.teacher'), value: certificate.teacherName },
    { label: t('staffCertificates.signed'), value: signedOn },
  ];
  if (certificate.revokeReason !== null) {
    rows.push({ label: t('staffCertificates.revokeReason'), value: certificate.revokeReason });
  }
  return (
    <section
      aria-labelledby="staff-certificate-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="staff-certificate-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {certificate.code}
      </h2>
      <LabelRows rows={rows} />
      {certificate.status === 'valid' && <RevokeForm code={certificate.code} />}
    </section>
  );
}
