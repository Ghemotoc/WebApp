/**
 * CompetitionPreview: "What pupils see", beside the competition form (bundle BOOKS-8, part 8b;
 * board G11-CompetitionNew, user story 8.11: "the competition panel exactly as the class will see
 * it, updating as the teacher types").
 *
 * What it shows: the class page's competition panel drawn from what is typed so far: "Open ·
 * Closes …", the name, the dates and who picks, every criterion with its outcomes, the total, the
 * pupils' "Join the competition" (drawn, not pressable: nothing can be joined from a preview) and
 * the joining note. Empty fields show nothing rather than placeholder words.
 * Who shows it: CompetitionFormPage. What it calls: CriteriaList and MetaLine.
 */
import { MetaLine } from '@/components/ui/MetaLine';
import { formatLocalDayAndTime } from '@/lib/local-time';

import type { Criterion } from '../api/classCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CriteriaList } from './CriteriaList';

/** What the preview needs. */
export interface CompetitionPreviewProps {
  name: string;
  /** The start and end as moments, or null while a field isn't a real date and time. */
  startsAt: string | null;
  endsAt: string | null;
  criteria: Criterion[];
  /** The teacher's name, for "Ms Ionescu picks one winner". */
  teacherName: string;
  /** False below grade 8: every entrant is a Contestant. */
  areWinnersAllowed: boolean;
}

/**
 * The line under the name: the dates, then who picks.
 *
 * @returns the paragraph
 */
function DatesLine(props: CompetitionPreviewProps) {
  const { t, i18n } = useClassCompetitionsTranslation();
  const moment = (instant: string) => formatLocalDayAndTime(new Date(instant), i18n.language);
  const pickKey = props.areWinnersAllowed ? 'card.picks' : 'card.noWinners';
  const dates =
    props.startsAt !== null && props.endsAt !== null
      ? `${t('card.dates', { start: moment(props.startsAt), end: moment(props.endsAt) })} `
      : '';
  return (
    <p className="m-0 type-body text-ink">
      {dates}
      {t(pickKey, { teacher: props.teacherName })}
    </p>
  );
}

/**
 * Renders the preview.
 *
 * @returns the heading and the panel
 */
export function CompetitionPreview(props: CompetitionPreviewProps) {
  const { t, i18n } = useClassCompetitionsTranslation();
  // Only criteria with a name show, as the class page would after saving.
  const shown = props.criteria
    .filter((criterion) => criterion.label.trim() !== '')
    .map((criterion) => ({
      ...criterion,
      outcomes: criterion.outcomes.filter((outcome) => outcome.trim() !== ''),
    }));
  const closes =
    props.endsAt === null
      ? []
      : [
          {
            text: t('card.phase.open', {
              date: formatLocalDayAndTime(new Date(props.endsAt), i18n.language),
            }),
          },
        ];
  return (
    <section aria-labelledby="competition-preview" className="flex flex-col gap-3">
      <h2 id="competition-preview" className="m-0 type-subheading">
        {t('form.previewTitle')}
      </h2>
      <div className="flex flex-col gap-2 rounded-card bg-surface-solid p-6 md:p-8">
        <MetaLine facts={[{ text: t('card.state.open'), kind: 'state' }, ...closes]} />
        {props.name.trim() !== '' && (
          <p className="m-0 type-heading [overflow-wrap:anywhere]">{props.name}</p>
        )}
        <DatesLine {...props} />
        <CriteriaList id="competition-preview-criteria" criteria={shown} showOutcomes />
        <span
          aria-hidden="true"
          className="mt-4 inline-flex h-11 w-fit items-center rounded-full button-glass px-4 type-label"
        >
          {t('card.join')}
        </span>
        <p className="m-0 type-meta">{t('card.joinNote')}</p>
      </div>
    </section>
  );
}
