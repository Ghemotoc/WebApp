/**
 * CompetitionCertificatesForm: the certificates of a class competition, filled in from its
 * confirmed results (bundle CLASS-POINTS, part 3; story S1-E8-17).
 *
 * What it shows: the competition's name as the programme, every entrant with the result the
 * teacher confirmed (Winner, Finalist or Contestant, and Readers' choice beside it), the look
 * picker and "Approve and sign". Nothing in the list can change here: the results are locked
 * once confirmed (Robert, 13 Nov 2026, decision 11), and the database refuses a certificate that
 * says anything else (check_class_certificate_result()). Only pupils who entered are listed
 * (decision 17).
 * Who shows it: ClassCertificatesPage, when the Winner card's "Issue certificates" opened it.
 * What it calls: useIssueClassCertificates() → issue_class_certificates().
 */
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

import { useIssueClassCertificates } from '../hooks/useClassCertificates';
import type { CertificateLook } from '../lib/certificateLook';
import {
  competitionCertificateEntries,
  type ConfirmedEntrant,
} from '../lib/competitionCertificates';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateLookPicker } from './CertificateLookPicker';
import { IssueAnswer } from './IssueAnswer';

/** One entrant as the list shows them. */
export interface CompetitionCertificateEntrant extends ConfirmedEntrant {
  displayName: string;
}

/** What the form needs. */
export interface CompetitionCertificatesFormProps {
  /** The class's address. */
  slug: string;
  /** The class's ID, the folder its crest is uploaded to (G13b). */
  spaceId: string;
  /** The competition's name: the programme the certificates print. */
  competitionName: string;
  /** The pupils who entered, with their confirmed results. */
  entrants: CompetitionCertificateEntrant[];
  /** The look to start from: the one last used in the class, or the default. */
  startLook: CertificateLook;
}

/**
 * The entrants and what each certificate will say. Read-only.
 *
 * @param props.entrants - the pupils who entered
 * @returns the list
 */
function ConfirmedResultsList({ entrants }: { entrants: CompetitionCertificateEntrant[] }) {
  const { t } = useCertificatesTranslation();
  return (
    <section aria-labelledby="competition-certificates-heading" className="flex flex-col gap-2">
      <h3 id="competition-certificates-heading" className="m-0 text-sm font-semibold text-ink">
        {t('class.competitionResultsTitle')}
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {entrants.map((entrant) => (
          <li
            key={entrant.handle}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2"
          >
            <span className="text-ink">{entrant.displayName}</span>
            <span className="flex flex-wrap items-center gap-2">
              <InfoPill tone={entrant.result === 'participant' ? 'sky' : 'gold'}>
                {t(`results.${entrant.result ?? 'participant'}`)}
              </InfoPill>
              {entrant.isReadersChoice && (
                <InfoPill tone="plum">{t('results.readers_choice')}</InfoPill>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Renders the form.
 *
 * @returns the form, or a note when nobody entered
 */
export function CompetitionCertificatesForm({
  slug,
  spaceId,
  competitionName,
  entrants,
  startLook,
}: CompetitionCertificatesFormProps) {
  const { t } = useCertificatesTranslation();
  const issuing = useIssueClassCertificates(slug);
  const [look, setLook] = useState<CertificateLook>(startLook);
  const otherProgramme = (
    <Link
      to={`/spaces/${slug}/certificates`}
      className="self-start font-semibold text-link underline"
    >
      {t('class.otherProgramme')}
    </Link>
  );

  /** Approves the confirmed results with the chosen look: the teacher's signature. */
  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const results = competitionCertificateEntries(entrants);
    await issuing.issue({ programmeName: competitionName, results, look }).catch(() => null);
  }

  if (entrants.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body">{t('class.noEntrants')}</p>
        {otherProgramme}
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={approve}>
      <p className="m-0 text-body">{t('class.fromCompetition', { name: competitionName })}</p>
      <ConfirmedResultsList entrants={entrants} />
      <CertificateLookPicker
        look={look}
        onChange={setLook}
        programmeName={competitionName}
        space={{ slug, spaceId }}
      />
      <p className="m-0 text-sm text-body">{t('class.competitionIntro')}</p>
      <Button type="submit" className="self-start" disabled={issuing.isRunning}>
        {t('class.approve')}
      </Button>
      <div aria-live="polite">
        <IssueAnswer issuing={issuing} />
      </div>
      {otherProgramme}
    </form>
  );
}
