/**
 * PrintedNameForm: "Your name on the certificate" (bundle CLASSES, part e; story S1-E8-12
 * criterion 2: a class certificate may print the student's real name with the school's name; it is
 * stored only with that certificate and deleted 30 days after the class is archived; decided 17 Oct
 * 2026, 12:44; GDPR art. 5(1)(c)).
 *
 * What it shows: why the name is asked for and when it goes, a text field, Save and "Use my pen
 * name", or, once the name was deleted, a note that the pen name prints instead.
 * Who shows it: CertificatePage, for a certificate that isn't revoked.
 * What it calls: useSetPrintedName() → set_certificate_printed_name().
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { MyCertificate } from '../api/certificates';
import { useSetPrintedName } from '../hooks/useCertificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/**
 * Whether the name was already deleted: more than 30 days after the class was archived.
 *
 * @param certificate - the certificate
 * @returns true once the deletion date has passed
 */
function isNameDeleted(certificate: MyCertificate): boolean {
  if (certificate.nameDeletedOn === null) return false;
  return new Date(certificate.nameDeletedOn).getTime() < Date.now();
}

/**
 * The answer after saving: a refusal or "Saved.", read out by screen readers.
 *
 * @param props.saving - the save call
 * @returns the live region
 */
function SaveAnswer({ saving }: { saving: ReturnType<typeof useSetPrintedName> }) {
  const { t } = useCertificatesTranslation();
  return (
    <div aria-live="polite">
      {saving.failure !== null && (
        <Notice tone="error">{t(`name.failures.${saving.failure.failure}`)}</Notice>
      )}
      {saving.isDone && saving.failure === null && (
        <Notice tone="success">{t('name.saved')}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @param props.certificate - the certificate
 * @returns the section
 */
export function PrintedNameForm({ certificate }: { certificate: MyCertificate }) {
  const { t, i18n } = useCertificatesTranslation();
  const saving = useSetPrintedName(certificate.id);
  const [name, setName] = useState(certificate.printedName ?? '');
  const language = certificateLanguageOf(i18n.language);

  /** Saves the typed name; an empty field prints the pen name. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saving.save(name).catch(() => null);
  }

  /** Clears the name, so the certificate prints the pen name. */
  async function clear() {
    setName('');
    await saving.save('').catch(() => null);
  }

  return (
    <section
      aria-labelledby="printed-name-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="printed-name-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('name.title')}
      </h2>
      <p className="m-0 text-body">{t('name.intro')}</p>
      {isNameDeleted(certificate) ? (
        <p className="m-0 text-body">{t('name.deleted')}</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={save}>
          <TextInput
            id="printed-name"
            label={t('name.label')}
            hint={t('name.hint')}
            value={name}
            maxLength={80}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
          />
          {certificate.nameDeletedOn !== null && (
            <p className="m-0 text-sm text-body">
              {t('name.deletesOn', { date: certificateDate(certificate.nameDeletedOn, language) })}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving.isRunning}>
              {t('name.save')}
            </Button>
            <Button variant="secondary" disabled={saving.isRunning} onClick={clear}>
              {t('name.clear')}
            </Button>
          </div>
        </form>
      )}
      <SaveAnswer saving={saving} />
    </section>
  );
}
