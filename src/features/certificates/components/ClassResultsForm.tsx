/**
 * ClassResultsForm: the teacher's results list for one programme (bundle CLASSES, part e; story
 * S1-E8-12 criteria 1 and 5).
 *
 * What it shows: the programme's name, one drop-down per student (no certificate, Contestant,
 * Finalist, Winner) and "Approve and sign", with a note that the approval is the teacher's
 * electronic signature (proposal for OPEN Q71). After approving, how many certificates were made.
 * Since bundle G13a the teacher also picks the certificates' colour and pattern
 * (CertificateLookPicker), and since G13b what the seal shows; the look is saved on each certificate as it is signed, and the form
 * starts from the look last used in the class.
 * Since BOOKS-8 part 8c (board G14) the form sits beside its Preview (CertificateFormColumns), and
 * each pupil is a row with a hairline above it, as in the competition's list.
 * Who shows it: ClassCertificatesPage, to the class's teacher, while the class isn't archived.
 * What it calls: useIssueClassCertificates() → issue_class_certificates().
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { certificateResults, type CertificateResult } from '../api/certificates';
import { useIssueClassCertificates } from '../hooks/useClassCertificates';
import type { CertificateLook } from '../lib/certificateLook';
import { pickedResults } from '../lib/pickedResults';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import type { CertificatePreviewEntry } from './CertificateLookPreview';
import { CertificateFormColumns } from './CertificateFormColumns';
import { CertificateLookPicker } from './CertificateLookPicker';
import { IssueAnswer } from './IssueAnswer';

/** One student the list offers. */
export interface ClassStudent {
  handle: string;
  displayName: string;
}

/**
 * One drop-down per student: no certificate, Contestant, Finalist or Winner.
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
      <legend className="mb-4 type-heading text-ink-heading">{t('class.resultsTitle')}</legend>
      <ul className="m-0 flex list-none flex-col p-0">
        {students.map((student) => (
          <li
            key={student.handle}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-3"
          >
            <span className="min-w-0 type-label break-words text-ink-heading">
              {student.displayName}
            </span>
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
 * Who the preview shows: the first pupil with a result picked, or the first pupil as a Winner.
 *
 * @param students - the class's pupils
 * @param picked - the result picked for each handle so far
 * @returns the preview's name and result
 */
function previewEntryOf(
  students: ClassStudent[],
  picked: Record<string, string>,
): CertificatePreviewEntry {
  const results = pickedResults(picked);
  const firstPicked = results[0];
  if (firstPicked === undefined)
    return { name: students[0]?.displayName ?? null, result: 'winner' };
  const student = students.find((candidate) => candidate.handle === firstPicked.handle);
  return { name: student?.displayName ?? null, result: firstPicked.result };
}

/**
 * Renders the form.
 *
 * @param props.space - the class: its address, its ID (the folder its crest is uploaded to, G13b)
 *   and its name, for the preview
 * @param props.students - the class's students
 * @param props.startLook - the look to start from: the one last used in the class, or the default
 * @returns the form
 */
export function ClassResultsForm({
  space,
  students,
  startLook,
}: {
  space: { slug: string; spaceId: string; name: string };
  students: ClassStudent[];
  startLook: CertificateLook;
}) {
  const { t } = useCertificatesTranslation();
  const issuing = useIssueClassCertificates(space.slug);
  const [programmeName, setProgrammeName] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [look, setLook] = useState<CertificateLook>(startLook);

  /** Approves the list with the chosen look: the teacher's signature. */
  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await issuing.issue({ programmeName, results: pickedResults(picked), look }).catch(() => null);
  }

  const preview = {
    look,
    programmeName,
    className: space.name,
    slug: space.slug,
    entry: previewEntryOf(students, picked),
  };
  return (
    <form onSubmit={approve}>
      <CertificateFormColumns preview={preview}>
        <TextInput
          id="certificate-programme"
          label={t('class.programmeLabel')}
          hint={t('class.programmeHint')}
          value={programmeName}
          maxLength={120}
          className="w-full max-w-[480px]"
          onChange={(event) => setProgrammeName(event.target.value)}
        />
        <ResultsList students={students} picked={picked} onPick={setPicked} />
        <CertificateLookPicker look={look} onChange={setLook} space={space} />
        <div className="flex flex-col gap-3">
          <p className="m-0 type-meta text-ink-muted">{t('class.intro')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={issuing.isRunning}>
              {t('class.approve')}
            </Button>
          </div>
          <div aria-live="polite">
            <IssueAnswer issuing={issuing} />
          </div>
        </div>
      </CertificateFormColumns>
    </form>
  );
}
