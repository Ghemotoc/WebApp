/**
 * CompetitionDetailsFields: the competition's name, and Starts and Ends side by side (bundle
 * CLASS-POINTS, part 2; story S1-E8-15; laid out as board G11-CompetitionNew by BOOKS-8 part 8b).
 *
 * Each moment is a date and a time on the teacher's own clock (DateTimeField, CALM-7d); the
 * end's note says it comes before the class closes. The name is at most 480 px wide.
 * Who uses it: CompetitionForm. What it calls: TextInput and DateTimeField.
 */
import { DateTimeField } from '@/components/ui/DateTimeField';
import { TextInput } from '@/components/ui/TextInput';
import { deviceTimeZone } from '@/lib/local-time';

import type { CompetitionMomentFields } from '../lib/competitionDates';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** The name and the two moments' fields, as the form holds them. */
export interface CompetitionDetails extends CompetitionMomentFields {
  name: string;
}

/**
 * Renders the fields.
 *
 * @param props.details - what is typed so far
 * @param props.onChange - takes the changed details
 * @returns the name, then the start and the end
 */
export function CompetitionDetailsFields(props: {
  details: CompetitionDetails;
  onChange: (details: CompetitionDetails) => void;
}) {
  const { details, onChange } = props;
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-[480px]">
        <TextInput
          id="competition-name"
          label={t('form.name')}
          hint={t('form.nameHint')}
          maxLength={120}
          value={details.name}
          onChange={(event) => onChange({ ...details, name: event.target.value })}
        />
      </div>
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-4">
        <DateTimeField
          id="competition-starts"
          value={details.starts}
          onChange={(starts) => onChange({ ...details, starts })}
          dateLabel={t('form.startsOn')}
          timeLabel={t('form.startTime')}
          skippedHourNote={(time) => t('form.skippedHourNote', { time })}
        />
        <DateTimeField
          id="competition-ends"
          value={details.ends}
          onChange={(ends) => onChange({ ...details, ends })}
          dateLabel={t('form.endsOn')}
          timeLabel={t('form.endTime')}
          note={t('form.datesHint', { zone: deviceTimeZone() })}
          skippedHourNote={(time) => t('form.skippedHourNote', { time })}
        />
      </div>
    </div>
  );
}
