/**
 * WritingStatusPill: where the writer is with a story (Planning to On hold, S1-E17-03) as an
 * information pill, its words and colour together, never colour alone (DoD pill system; bundle
 * G10a, boards AtlasHome and AtlasStory).
 *
 * Who uses it: StoryPlanCard (/plan) and AtlasStoryCard (at a glance). What it calls: InfoPill.
 */
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { WritingStatus } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** A tone per status: gold while planning, sky while drafting, warmer as it nears the end. */
const statusTones: Record<WritingStatus, PillTone> = {
  planning: 'gold',
  drafting: 'sky',
  revising: 'blush',
  editing: 'plum',
  finished: 'sage',
  on_hold: 'neutral',
};

/**
 * Renders the pill.
 *
 * @param props.status - the story's writing status
 * @returns the pill with the status's name
 */
export function WritingStatusPill({ status }: { status: WritingStatus }) {
  const { t } = useAtlasTranslation();
  return <InfoPill tone={statusTones[status]}>{t(`writingStatus.${status}`)}</InfoPill>;
}
