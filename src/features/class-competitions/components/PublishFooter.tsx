/**
 * PublishFooter: the end of the results page while the teacher scores (bundle CLASS-POINTS, part
 * 2; story S1-E8-17 criteria 4 to 8; redrawn by BOOKS-8 part 8b, board G12-CompetitionResults,
 * user story 8.12; Robert, 13 Nov 2026: the teacher decides, the app never suggests or ranks, and
 * results can't change once published).
 *
 * What it shows: Readers' choice (who gets it, worked out as the database will), the Winner's
 * chapter to show the class once a Winner is picked, what publishing does, then "Publish results"
 * (asks once) and "Save as draft" (saves the scores only), and what happened. "Publish results"
 * stays pressable: with no Winner it says in words what is missing (DoD, design books item 9).
 * Who shows it: ScoringWorkspace. What it calls: nothing; the workspace saves and publishes.
 */
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { ScoringEntrant } from '../api/competitionScoring';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { ConfirmedButton } from './ConfirmedButton';

/** What happened on the last press. */
export type FooterOutcome = 'draftSaved' | 'range' | 'pickWinner' | null;

/** What the footer needs. */
export interface PublishFooterProps {
  areWinnersAllowed: boolean;
  /** The entrants who get Readers' choice, by name. */
  readersChoice: ScoringEntrant[];
  /** The chosen Winner, or undefined while there is none. */
  winner: ScoringEntrant | undefined;
  chapterId: string;
  onChapter: (chapterId: string) => void;
  outcome: FooterOutcome;
  /** The database's refusal, as a failures.* key's ending, or null. */
  failure: string | null;
  isRunning: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  /** Called instead of asking, when "Publish results" is pressed with no Winner picked. */
  onMissingWinner: () => void;
}

/**
 * Readers' choice: who also gets the certificate, in a tinted note.
 *
 * @returns the note, or nothing when nobody gets it
 */
function ReadersChoiceNote({ entrants }: { entrants: ScoringEntrant[] }) {
  const { t, i18n } = useClassCompetitionsTranslation();
  if (entrants.length === 0) return null;
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    entrants.map((entrant) => entrant.displayName),
  );
  return (
    <Notice tone="success" title={t('results.readersChoice')}>
      {t('scoring.readersChoiceBody', { count: entrants.length, names })}
    </Notice>
  );
}

/**
 * The Winner's chapter the class is shown, once a Winner with chapters is picked.
 *
 * @returns the drop-down, or nothing
 */
function WinningChapter({ winner, chapterId, onChapter }: PublishFooterProps) {
  const { t } = useClassCompetitionsTranslation();
  if (winner === undefined || winner.chapters.length === 0) return null;
  return (
    <Select
      id="competition-winning-chapter"
      label={t('scoring.winningChapter')}
      isLabelVisible
      placement="form"
      options={[
        { value: '', label: t('scoring.noChapter') },
        ...winner.chapters.map((chapter) => ({ value: chapter.id, label: chapter.title })),
      ]}
      value={chapterId}
      onChange={onChapter}
    />
  );
}

/**
 * What the last press ended with, in words.
 *
 * @returns the live region
 */
function FooterNotice({ outcome, failure }: PublishFooterProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div aria-live="polite">
      {outcome === 'range' && <Notice tone="error">{t('failures.score_range')}</Notice>}
      {outcome === 'pickWinner' && <Notice tone="error">{t('scoring.pickWinner')}</Notice>}
      {outcome === 'draftSaved' && <Notice tone="success">{t('scoring.draftSaved')}</Notice>}
      {failure !== null && outcome === null && (
        <Notice tone="error">{t(`failures.${failure}`)}</Notice>
      )}
    </div>
  );
}

/**
 * "Publish results": asks once, or, while a Winner is still needed, says so without asking.
 *
 * @returns the button
 */
function PublishButton(props: PublishFooterProps) {
  const { t } = useClassCompetitionsTranslation();
  if (props.areWinnersAllowed && props.winner === undefined) {
    return (
      <Button disabled={props.isRunning} onClick={props.onMissingWinner}>
        {t('scoring.publish')}
      </Button>
    );
  }
  return (
    <ConfirmedButton
      label={t('scoring.publish')}
      question={t('scoring.confirmQuestion')}
      yesLabel={t('scoring.confirmYes')}
      cancelLabel={t('scoring.cancel')}
      variant="primary"
      isDisabled={props.isRunning}
      onConfirm={props.onPublish}
    />
  );
}

/**
 * Renders the footer.
 *
 * @returns Readers' choice, the chapter, the note and the buttons
 */
export function PublishFooter(props: PublishFooterProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="flex flex-col gap-6">
      {props.areWinnersAllowed && <ReadersChoiceNote entrants={props.readersChoice} />}
      <WinningChapter {...props} />
      <p className="m-0 type-meta">
        {t(props.areWinnersAllowed ? 'scoring.publishNote' : 'scoring.publishNoteLow')}
      </p>
      <FooterNotice {...props} />
      <ButtonRow>
        <PublishButton {...props} />
        <Button variant="secondary" disabled={props.isRunning} onClick={props.onSaveDraft}>
          {t('scoring.saveDraft')}
        </Button>
      </ButtonRow>
    </div>
  );
}
