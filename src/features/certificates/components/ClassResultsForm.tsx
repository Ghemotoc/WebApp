/**
 * ClassResultsForm: the teacher's results list for one programme (bundle CLASSES, part e; story
 * S1-E8-12 criteria 1 and 5).
 *
 * What it shows: the programme's name, one drop-down per student (no certificate, took part,
 * finalist, winner) and "Approve and sign", with a note that the approval is the teacher's
 * electronic signature (proposal for OPEN Q71). After approving, how many certificates were made.
 * Since bundle G13a the teacher also picks the certificates' colour and pattern
 * (CertificateLookPicker); the look is saved on each certificate as it is signed, and the form
 * starts from the look last used in the class.
 * Who shows it: ClassCertificatesPage, to the class's teacher, while the class isn't archived.
 * What it calls: useIssueClassCertificates() → issue_class_certificates().
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { certificateResults, type CertificateResult } from '../api/certificates';
import { useIssueClassCertificates } from '../hooks/useClassCertificates';
import type { CertificateLook } from '../lib/certificateLook';
import { pickedResults } from '../lib/pickedResults';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateLookPicker } from './CertificateLookPicker';

/** One student the list offers. */
export interface ClassStudent {
  handle: string;
  displayName: string;
}

/**
 * The answer under the button: a refusal, nothing new, or how many were signed.
 *
 * @param props.issuing - the issue call
 * @returns the notice, or nothing
 */
function IssueAnswer({ issuing }: { issuing: ReturnType<typeof useIssueClassCertificates> }) {
  const { t } = useCertificatesTranslation();
  if (issuing.failure !== null) {
    return <Notice tone="error">{t(`class.failures.${issuing.failure.failure}`)}</Notice>;
  }
  if (issuing.issued === null) return null;
  if (issuing.issued === 0) return <Notice tone="info">{t('class.nothingChanged')}</Notice>;
  return <Notice tone="success">{t('class.approved', { count: issuing.issued })}</Notice>;
}

/**
 * One drop-down per student: no certificate, took part, finalist or winner.
 *
 * @param props.students - the class's students
 * @param props.picked - the result picked for each handle so far
 * @param props.onPick - called with the new choices
 * @returns the fieldset
 */
function ResultsList({
  students,
  picked,
  onPick,
}: {
  students: ClassStudent[];
  picked: Record<string, string>;
  onPick: (picked: Record<string, string>) => void;
}) {
  const { t } = useCertificatesTranslation();
  const resultOptions = [
    { value: '', label: t('class.none') },
    ...certificateResults.map((result: CertificateResult) => ({
      value: result,
      label: t(`results.${result}`),
    })),
  ];
  return (
    <fieldset className="m-0 flex flex-col gap-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{t('class.resultsTitle')}</legend>
      <ul className="m-0 flex list-none flex-col p-0">
        {students.map((student) => (
          <li
            key={student.handle}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2"
          >
            <span className="text-ink">{student.displayName}</span>
            <Select
              id={`certificate-result-${student.handle}`}
              label={t('class.resultFor', { name: student.displayName })}
              options={resultOptions}
              value={picked[student.handle] ?? ''}
              onChange={(value) => onPick({ ...picked, [student.handle]: value })}
            />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/**
 * Renders the form.
 *
 * @param props.slug - the class's address
 * @param props.students - the class's students
 * @param props.startLook - the look to start from: the one last used in the class, or the default
 * @returns the form
 */
export function ClassResultsForm({
  slug,
  students,
  startLook,
}: {
  slug: string;
  students: ClassStudent[];
  startLook: CertificateLook;
}) {
  const { t } = useCertificatesTranslation();
  const issuing = useIssueClassCertificates(slug);
  const [programmeName, setProgrammeName] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [look, setLook] = useState<CertificateLook>(startLook);

  /** Approves the list with the chosen look: the teacher's signature. */
  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await issuing.issue({ programmeName, results: pickedResults(picked), look }).catch(() => null);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={approve}>
      <TextInput
        id="certificate-programme"
        label={t('class.programmeLabel')}
        hint={t('class.programmeHint')}
        value={programmeName}
        maxLength={120}
        onChange={(event) => setProgrammeName(event.target.value)}
      />
      <ResultsList students={students} picked={picked} onPick={setPicked} />
      <CertificateLookPicker look={look} onChange={setLook} programmeName={programmeName} />
      <p className="m-0 text-sm text-body">{t('class.intro')}</p>
      <Button type="submit" className="self-start" disabled={issuing.isRunning}>
        {t('class.approve')}
      </Button>
      <div aria-live="polite">
        <IssueAnswer issuing={issuing} />
      </div>
    </form>
  );
}
