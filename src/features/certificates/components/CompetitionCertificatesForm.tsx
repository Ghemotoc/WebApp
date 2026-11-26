/**
 * CompetitionCertificatesForm: the certificates of a class competition, filled in from its
 * published results (bundle CLASS-POINTS, part 3; story S1-E8-17; board G14, bundle BOOKS-8, part
 * 8c).
 *
 * What it shows, left: "From <competition>" with when the results were published, the programme
 * (the competition's name, read-only), every certificate to sign (CertificateEntryRows), the
 * "Look" section and "Approve and sign"; right: the Preview. Nothing in the list can change here:
 * the results are locked once confirmed (Robert, 13 Nov 2026, decision 11), and the database
 * refuses a certificate that says anything else (check_class_certificate_result()). Only pupils
 * who entered are listed (decision 17).
 * Who shows it: ClassCertificatesPage, when the Winner card's "Issue certificates" opened it.
 * What it calls: useIssueClassCertificates() → issue_class_certificates().
 */
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { TextInput } from '@/components/ui/TextInput';

import { useIssueClassCertificates } from '../hooks/useClassCertificates';
import { certificateDate, certificateLanguageOf } from '../lib/certificateDate';
import type { CertificateLook } from '../lib/certificateLook';
import { competitionCertificateEntries } from '../lib/competitionCertificates';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateEntryRows, type CompetitionCertificateEntrant } from './CertificateEntryRows';
import { CertificateFormColumns } from './CertificateFormColumns';
import { CertificateLookPicker } from './CertificateLookPicker';
import { IssueAnswer } from './IssueAnswer';

/** What the form needs. */
export interface CompetitionCertificatesFormProps {
  /** The class: its address, its ID (the folder its crest is uploaded to, G13b) and its name. */
  space: { slug: string; spaceId: string; name: string };
  /** The competition's name (the programme the certificates print) and when its results came out. */
  competition: { name: string; publishedOn: string };
  /** The pupils who entered, with their confirmed results. */
  entrants: CompetitionCertificateEntrant[];
  /** The look to start from: the one last used in the class, or the default. */
  startLook: CertificateLook;
}

/**
 * "From <competition>", when its results came out, the programme and the rows.
 *
 * @param props.competition - the competition's name and publishing date
 * @param props.entrants - the pupils who entered
 * @returns the section
 */
function ResultsSection({
  competition,
  entrants,
}: Pick<CompetitionCertificatesFormProps, 'competition' | 'entrants'>) {
  const { t, i18n } = useCertificatesTranslation();
  const language = certificateLanguageOf(i18n.language);
  return (
    <section
      aria-labelledby="competition-certificates-heading"
      className="flex flex-col gap-4 border-t border-hairline pt-6"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="competition-certificates-heading"
          className="m-0 type-heading break-words text-ink-heading"
        >
          {t('class.fromCompetitionTitle', { name: competition.name })}
        </h2>
        {competition.publishedOn !== '' && (
          <p className="m-0 type-meta text-ink-muted">
            {t('class.filledInOn', { date: certificateDate(competition.publishedOn, language) })}
          </p>
        )}
      </div>
      <TextInput
        id="certificate-programme"
        label={t('class.programmeLabel')}
        hint={t('class.programmeFromCompetition')}
        value={competition.name}
        readOnly
        className="w-full max-w-[480px]"
      />
      <CertificateEntryRows entrants={entrants} />
      <p className="m-0 max-w-none type-meta text-ink-muted">{t('class.competitionNote')}</p>
    </section>
  );
}

/**
 * Renders the form.
 *
 * @returns the form, or a note when nobody entered
 */
export function CompetitionCertificatesForm({
  space,
  competition,
  entrants,
  startLook,
}: CompetitionCertificatesFormProps) {
  const { t } = useCertificatesTranslation();
  const issuing = useIssueClassCertificates(space.slug);
  const [look, setLook] = useState<CertificateLook>(startLook);
  const otherProgramme = (
    <Link
      to={`/spaces/${space.slug}/certificates`}
      className={buttonClassName({ variant: 'text' })}
    >
      {t('class.otherProgramme')}
    </Link>
  );

  /** Approves the confirmed results with the chosen look: the teacher's signature. */
  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const results = competitionCertificateEntries(entrants);
    await issuing.issue({ programmeName: competition.name, results, look }).catch(() => null);
  }

  if (entrants.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 type-body text-ink-muted">{t('class.noEntrants')}</p>
        {otherProgramme}
      </div>
    );
  }
  const first = entrants[0];
  return (
    <form onSubmit={approve}>
      <CertificateFormColumns
        preview={{
          look,
          programmeName: competition.name,
          className: space.name,
          slug: space.slug,
          entry: { name: first?.displayName ?? null, result: first?.result ?? 'participant' },
        }}
      >
        <ResultsSection competition={competition} entrants={entrants} />
        <CertificateLookPicker look={look} onChange={setLook} space={space} />
        <div className="flex flex-col gap-3">
          <p className="m-0 type-meta text-ink-muted">{t('class.competitionIntro')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={issuing.isRunning}>
              {t('class.approve')}
            </Button>
            {otherProgramme}
          </div>
          <div aria-live="polite">
            <IssueAnswer issuing={issuing} />
          </div>
        </div>
      </CertificateFormColumns>
    </form>
  );
}
