/**
 * SpotlightItem: one writer-of-the-week pick on the staff page: the writer, the first day, the
 * writer's answer and the English line, with Delete (bundle GAPS-12e). There is no Edit: the
 * writer agreed to those words, so a change means deleting the pick and inviting again.
 *
 * Who shows it: SpotlightsSection. What it calls: the useStaffSpotlights state it is given.
 */
import { Card } from '@/components/ui/Card';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { SpotlightAnswer, StaffSpotlight } from '../../api/hubSpotlight';
import type { useStaffSpotlights } from '../../hooks/useStaffSpotlights';
import { useHubTranslation } from '../../registerHubTranslations';

import { ConfirmDeleteButtons } from './ConfirmDeleteButtons';
import { formatStaffDay } from './formatStaffDay';

/** The pill colour for each answer; the words say it too, so colour is never the only sign. */
const answerTones: Record<SpotlightAnswer, PillTone> = {
  waiting: 'neutral',
  agreed: 'sage',
  declined: 'blush',
};

/** What one item needs. */
export interface SpotlightItemProps {
  spotlight: StaffSpotlight;
  state: ReturnType<typeof useStaffSpotlights>;
}

/**
 * Renders one pick.
 *
 * @returns the list item
 */
export function SpotlightItem({ spotlight, state }: SpotlightItemProps) {
  const { t, i18n } = useHubTranslation();
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-sm text-meta">
            {t('hubStaff.spotlights.startsOn', {
              day: formatStaffDay(spotlight.startsOn, i18n.language),
            })}
          </p>
          <InfoPill tone={answerTones[spotlight.answer]}>
            {t(`hubStaff.spotlights.answers.${spotlight.answer}`)}
          </InfoPill>
        </div>
        <p className="m-0 font-semibold break-words text-heading">
          {spotlight.displayName} <span className="font-normal text-meta">@{spotlight.handle}</span>
        </p>
        <p lang="en" className="m-0 text-sm break-words text-body">
          {spotlight.reasonEn}
        </p>
        <div className="flex flex-wrap gap-3">
          <ConfirmDeleteButtons
            name={spotlight.displayName}
            isBusy={state.isChanging}
            onDelete={() => state.remove.mutate(spotlight.id)}
          />
        </div>
      </Card>
    </li>
  );
}
