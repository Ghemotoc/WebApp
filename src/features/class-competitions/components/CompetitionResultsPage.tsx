/**
 * CompetitionResultsPage: /spaces/<slug>/competition/<id>/results, where the teacher assesses
 * the entries and confirms the results, and later reads them back (bundle CLASS-POINTS, part 2;
 * story S1-E8-17).
 *
 * What it shows: while the competition is being assessed, one EntrantScoreCard per entrant in
 * order of name (never sorted by points: nobody is ranked) and the ResultsForm; once
 * the results are confirmed, a read-only table of each entrant's result and criteria total.
 * Before the competition ends it says scores open later; anyone but the class's teacher is told
 * the page is the teacher's. Plain page, no doodles, no ads.
 * Who shows it: the router; the class page's competition card links here.
 * What it calls: useCompetitionScoring → class_competition_scoring(), which answers only the
 * class's teacher.
 */
import { useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import { competitionFailureOf } from '../api/competitionErrors';
import type { CompetitionScoring, ScoringEntrant } from '../api/competitionScoring';
import { useCompetitionScoring } from '../hooks/useCompetitionScoring';
import { maxTotal, totalOf } from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { EntrantScoreCard } from './EntrantScoreCard';
import { ResultsForm } from './ResultsForm';

/**
 * One entrant's result in words: "Winner", "Finalist" or "Contestant", plus "Readers' choice"
 * when classmates gave their chapters the most points.
 *
 * @param props.entrant - the entrant
 * @returns the words
 */
function ResultWords({ entrant }: { entrant: ScoringEntrant }) {
  const { t } = useClassCompetitionsTranslation();
  const words = [t(`results.${entrant.result ?? 'participant'}`)];
  if (entrant.isReadersChoice) words.push(t('results.readersChoice'));
  return <>{words.join(', ')}</>;
}

/**
 * The confirmed results, read-only: one row per entrant, by name.
 *
 * @param props.scoring - the competition
 * @returns the note and the table
 */
function PublishedResults({ scoring }: { scoring: CompetitionScoring }) {
  const { t } = useClassCompetitionsTranslation();
  const max = maxTotal(scoring.criteria);
  const cell = 'border-t border-border px-3 py-2.5 text-left align-top';
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card md:p-6">
      <p className="m-0 text-body">{t('scoring.published')}</p>
      {/* A region the keyboard can scroll, so a narrow phone never scrolls the page sideways. */}
      <div
        role="region"
        aria-label={t('scoring.tableCaption')}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table className="w-full border-collapse text-[15px] text-body">
          <caption className="sr-only">{t('scoring.tableCaption')}</caption>
          <thead>
            <tr>
              {(['columnPupil', 'columnResult', 'columnTotal'] as const).map((column) => (
                <th key={column} scope="col" className="px-3 py-2 text-left text-sm text-ink">
                  {t(`scoring.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoring.entrants.map((entrant) => {
              const total = totalOf(scoring.criteria, entrant.scores);
              return (
                <tr key={entrant.handle}>
                  <th scope="row" className={`${cell} font-semibold wrap-anywhere text-ink`}>
                    {entrant.displayName}
                  </th>
                  <td className={cell}>
                    <ResultWords entrant={entrant} />
                  </td>
                  <td className={cell}>
                    {total === null ? '–' : t('scoring.total', { total, max })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * What goes under the heading, by where the competition stands.
 *
 * @param props.scoring - the competition
 * @returns a note, the score cards and the results form, or the confirmed results
 */
function ScoringBody({ scoring }: { scoring: CompetitionScoring }) {
  const { t } = useClassCompetitionsTranslation();
  if (scoring.phase === 'upcoming' || scoring.phase === 'open') {
    return <p className="m-0 text-body">{t('scoring.notYet')}</p>;
  }
  if (scoring.entrants.length === 0) {
    return <p className="m-0 text-body">{t('scoring.noEntrants')}</p>;
  }
  if (scoring.phase === 'published') return <PublishedResults scoring={scoring} />;
  return (
    <>
      {scoring.entrants.map((entrant) => (
        <EntrantScoreCard
          key={entrant.handle}
          competitionId={scoring.id}
          criteria={scoring.criteria}
          entrant={entrant}
        />
      ))}
      <ResultsForm scoring={scoring} />
    </>
  );
}

/**
 * The page's body: nothing while loading, why the read failed, or the competition.
 *
 * @param props.competitionId - the competition's ID from the address
 * @returns the body
 */
function ResultsBody({ competitionId }: { competitionId: string }) {
  const { t } = useClassCompetitionsTranslation();
  const read = useCompetitionScoring(competitionId);
  if (read.isError) {
    const failure = competitionFailureOf(read.error)?.failure;
    if (failure === 'not_allowed')
      return <p className="m-0 text-body">{t('scoring.teacherOnly')}</p>;
    if (failure === 'missing') return <p className="m-0 text-body">{t('failures.missing')}</p>;
    return <Notice tone="error">{t('scoring.loadFailed')}</Notice>;
  }
  if (read.data === undefined) return null;
  return <ScoringBody scoring={read.data} />;
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function CompetitionResultsPage() {
  const { t } = useClassCompetitionsTranslation();
  const { spaceSlug = '', competitionId = '' } = useParams();
  const className = useSpace(spaceSlug).data?.name ?? '';
  const scoring = useCompetitionScoring(competitionId).data;
  const isPublished = scoring?.phase === 'published';
  const title = t(isPublished ? 'scoring.titlePublished' : 'scoring.title');
  // The competition's name once it has loaded; the class's name until then.
  const name = scoring?.name ?? className;
  return (
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-10">
      <title>{t('scoring.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name: className }} current={title} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {title}
        </h1>
        {!isPublished && <p className="m-0 max-w-[640px] text-body">{t('scoring.intro')}</p>}
      </header>
      <ResultsBody competitionId={competitionId} />
    </PageContainer>
  );
}
