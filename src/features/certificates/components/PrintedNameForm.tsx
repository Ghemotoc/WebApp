/**
 * PrintedNameForm: the "Name and language" panel beside a certificate (bundle CLASSES, part e;
 * story S1-E8-12 criteria 2 and 4; board G16, bundle BOOKS-8, part 8c).
 *
 * Why a real name: a class certificate may print the member's real name with the school's name; it
 * is stored only with that certificate and deleted 30 days after the class is archived (decided
 * 17 Oct 2026, 12:44; CLAUDE.md rule 5; GDPR art. 5(1)(c)). An empty field prints the pen name, so
 * there is no separate "Use the pen name" button (G16). A contest certificate never stores a real
 * name (CONTESTS-13b2c), so it shows no name field.
 * What it shows: the printed-name field (or, once the name was deleted, a note), the language the
 * certificate prints in, "Print or save as PDF" and Save, and where anyone can check the code.
 * Who shows it: CertificatePage, for a certificate that isn't revoked.
 * What it calls: useSetPrintedName() → set_certificate_printed_name(), and window.print().
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';
import { brand } from '@/config/brand';

import type { MyCertificate } from '../api/certificates';
import { useSetPrintedName } from '../hooks/useCertificates';
import {
  certificateDate,
  certificateLanguageOf,
  type CertificateLanguage,
} from '../lib/certificateDate';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The two languages, each named in its own language (WCAG 3.1.2). */
const languageOptions = [
  { value: 'ro', label: 'Română', lang: 'ro' },
  { value: 'en', label: 'English', lang: 'en' },
] as const;

/** What the panel needs. */
interface PrintedNameFormProps {
  /** The certificate. */
  certificate: MyCertificate;
  /** The language the sheet prints in. */
  language: CertificateLanguage;
  /** Called when the member picks the other language. */
  onLanguageChange: (language: CertificateLanguage) => void;
}

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
 * The printed-name field with its hint, or the note once the name was deleted.
 *
 * @param props.certificate - the certificate
 * @param props.name - what is typed
 * @param props.onNameChange - called as the member types
 * @returns the field, or the note
 */
function NameField({
  certificate,
  name,
  onNameChange,
}: {
  certificate: MyCertificate;
  name: string;
  onNameChange: (name: string) => void;
}) {
  const { t, i18n } = useCertificatesTranslation();
  if (isNameDeleted(certificate))
    return <p className="m-0 type-body text-ink-muted">{t('name.deleted')}</p>;
  // The hint says when the name goes once the class is archived (S1-E8-12 criterion 2).
  const deletesOn =
    certificate.nameDeletedOn === null
      ? ''
      : ` ${t('name.deletesOn', { date: certificateDate(certificate.nameDeletedOn, certificateLanguageOf(i18n.language)) })}`;
  return (
    <TextInput
      id="printed-name"
      label={t('name.label')}
      hint={`${t('name.hint')}${deletesOn}`}
      value={name}
      maxLength={80}
      autoComplete="name"
      className="w-full max-w-[480px]"
      onChange={(event) => onNameChange(event.target.value)}
    />
  );
}

/**
 * Renders the panel.
 *
 * @param props - see PrintedNameFormProps
 * @returns the section
 */
export function PrintedNameForm({ certificate, language, onLanguageChange }: PrintedNameFormProps) {
  const { t } = useCertificatesTranslation();
  const saving = useSetPrintedName(certificate.id);
  const [name, setName] = useState(certificate.printedName ?? '');
  const hasNameField = !certificate.isContest && !isNameDeleted(certificate);

  /** Saves the typed name; an empty field prints the pen name. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saving.save(name).catch(() => null);
  }

  return (
    <section aria-labelledby="name-and-language-heading" className="flex min-w-0 flex-col gap-2">
      <h2 id="name-and-language-heading" className="m-0 type-subheading text-ink-heading">
        {t('name.title')}
      </h2>
      <form className="flex flex-col gap-4" onSubmit={save}>
        {!certificate.isContest && (
          <NameField certificate={certificate} name={name} onNameChange={setName} />
        )}
        <SegmentedControl
          legend={t('page.languageLabel')}
          name="certificate-language"
          options={languageOptions}
          value={language}
          onChange={(value) => onLanguageChange(certificateLanguageOf(value))}
        />
        {/* The main action first, on the left (DoD, button rows); Save only where a name can change.
            Print carries no icon: the reader's 345 KB budget has no room for one more chunk in the
            router's preload lists (docs/board-fixes.md, G16). */}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => window.print()}>
            {t('page.print')}
          </Button>
          {hasNameField && (
            <Button type="submit" variant="secondary" size="lg" disabled={saving.isRunning}>
              {t('name.save')}
            </Button>
          )}
        </div>
        <p className="m-0 type-meta text-ink-muted">
          {t('page.checkAt', { domain: brand.siteDomain, code: certificate.code })}
        </p>
      </form>
      <SaveAnswer saving={saving} />
    </section>
  );
}
